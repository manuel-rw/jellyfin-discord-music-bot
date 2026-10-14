import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  getVoiceConnections,
  joinVoiceChannel,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';

import { Injectable, Logger, OnModuleDestroy, Scope } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';

import {
  GuildMember,
  InteractionEditReplyOptions,
  MessagePayload,
  VoiceChannel,
} from 'discord.js';

import { TryResult } from '../../models/try-result.model';
import { Track } from '../../models/track';
import { PlaybackService } from '../../playback/playback.service';
import { JellyfinStreamBuilderService } from '../jellyfin/jellyfin.stream.builder.service';
import { JellyfinWebSocketService } from '../jellyfin/jellyfin.websocket.service';
import { JellyfinWebSocketManagerService } from '../jellyfin/jellyfin.websocket.manager.service';

import { buildErrorMessage, buildMessage } from './discord.message.builder';
import { EventNames } from '../../events/names';

/**
 * Service for managing Discord voice connections and audio playback
 * Supports sharding by maintaining separate state per guild
 * Each guild can have its own voice connection and audio player
 */
@Injectable({ scope: Scope.DEFAULT })
export class DiscordVoiceService implements OnModuleDestroy {
  private readonly logger = new Logger(DiscordVoiceService.name);
  
  // Maps guildId to their respective voice connections and audio players
  private audioPlayers: Map<string, AudioPlayer> = new Map();
  private voiceConnections: Map<string, VoiceConnection> = new Map();
  private audioResources: Map<string, AudioResource> = new Map();
  private autoLeaveIntervalIds: Map<string, NodeJS.Timeout> = new Map();
  private voiceChannelInfos: Map<string, {
    name: string;
    bitrate: number;
    channelId: string;
  }> = new Map();
  
  // Track the currently active guild for audio events
  private activeGuildId: string | null = null;

  constructor(
    private readonly playbackService: PlaybackService,
    private readonly jellyfinWebSocketService: JellyfinWebSocketService,
    private readonly jellyfinWebSocketManagerService: JellyfinWebSocketManagerService,
    private readonly jellyfinStreamBuilder: JellyfinStreamBuilderService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.debug('DiscordVoiceService initialized');
  }

  onModuleDestroy() {
    // Clean up all intervals
    for (const [guildId, intervalId] of this.autoLeaveIntervalIds) {
      try {
        clearInterval(intervalId);
        this.logger.debug(`Cleared autoLeaveIntervalId for guild ${guildId}`);
      } catch (error) {
        this.logger.error(`Error while clearing autoLeaveIntervalId for guild ${guildId}: ${error}`);
      }
    }
    
    // Disconnect all voice connections
    this.disconnectAllGuilds();
  }

  @OnEvent(EventNames.Circuit.AnnounceTrack)
  handleOnNewTrack(track: Track) {
    const url = track.getStreamUrl(this.jellyfinStreamBuilder);
    const resource = createAudioResource(url, {
      inlineVolume: true,
    });
    this.playResource(resource, track.name, url);
  }

  tryJoinChannelAndEstablishVoiceConnection(
    member: GuildMember,
  ): TryResult<InteractionEditReplyOptions> {
    const guildId = member.guild.id;
    
    // Check if we already have a voice connection for this guild
    if (this.voiceConnections.has(guildId)) {
      this.logger.debug(
        `Avoided joining the voice channel for guild ${guildId} because voice connection is already defined`,
      );
      return {
        success: true,
        reply: {},
      };
    }

    if (member.voice.channel === null) {
      this.logger.log(
        `Unable to join a voice channel because the member ${member.user.username} is not in a voice channel`,
      );
      return {
        success: false,
        reply: {
          embeds: [
            buildMessage({
              title: 'Unable to join your channel',
              description:
                "I am unable to join your channel, because you don't seem to be in a voice channel. Connect to a channel first to use this command",
            }),
          ],
        },
      };
    }

    const channel = member.voice.channel;
    const guildId = channel.guildId;
    
    // Store voice channel info for this guild
    this.voiceChannelInfos.set(guildId, {
      name: channel.name,
      bitrate: channel.bitrate,
      channelId: channel.id,
    });

    joinVoiceChannel({
      channelId: channel.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      guildId: channel.guildId,
    });

    // Initialize WebSocket connection for this specific guild
    // This allows each guild to have its own WebSocket control
    this.jellyfinWebSocketManagerService.initializeAndConnect(guildId);
    this.logger.debug(`Initialized WebSocket connection for guild ${guildId}`);

    // Set this guild as the active one
    this.activeGuildId = guildId;

    // Get the voice connection after joining
    const voiceConnection = getVoiceConnection(guildId);
    this.voiceConnections.set(guildId, voiceConnection);
    
    voiceConnection.on(VoiceConnectionStatus.Disconnected, () => {
      this.logger.debug(`Voice connection for guild ${guildId} disconnected`);
      this.playbackService.getPlaylistOrDefault().clear();
      this.leaveGuildChannel(guildId);
    });

    const voiceChannelId = channel.id;
    const intervalId = setInterval(async () => {
      const voiceChannel = (await member.guild.channels.fetch(
        voiceChannelId,
      )) as VoiceChannel | undefined;
      if (voiceChannel === undefined) {
        const intervalId = this.autoLeaveIntervalIds.get(guildId);
        if (!intervalId) {
          this.logger.error(
            `Unable to cancel interval for guild ${guildId} because interval id is not defined`,
          );
          return;
        }
        clearInterval(intervalId);
        this.autoLeaveIntervalIds.delete(guildId);
        return;
      }
      const voiceChannelMembersExpectBots = voiceChannel.members.filter(
        (member) => !member.user.bot,
      );

      if (voiceChannelMembersExpectBots.size > 0) return;

      const intervalId = this.autoLeaveIntervalIds.get(guildId);
      if (!intervalId) {
        return;
      }

      try {
        this.stop(true, guildId);
        this.leaveGuildChannel(guildId);
        clearInterval(intervalId);
        this.autoLeaveIntervalIds.delete(guildId);
      } catch (error) {
        this.logger.error(`Failed to disconnect voice channel for guild ${guildId}: ${error}`);
      }
    }, 5000);
    
    this.autoLeaveIntervalIds.set(guildId, intervalId);

    return {
      success: true,
      reply: {},
    };
  }

  getVoiceConnection(guildId?: string): VoiceConnection | undefined {
    if (guildId) {
      return this.voiceConnections.get(guildId);
    }
    // For backwards compatibility, return the first connection if no guildId specified
    if (this.activeGuildId) {
      return this.voiceConnections.get(this.activeGuildId);
    }
    return undefined;
  }
  
  /**
   * Get voice connection for a specific guild
   * @param guildId The Discord guild ID
   * @returns The voice connection for the guild or undefined
   */
  getVoiceConnectionForGuild(guildId: string): VoiceConnection | undefined {
    return this.voiceConnections.get(guildId);
  }

  changeCurrentResourceVolume(volume: number, guildId?: string) {
    const targetGuildId = guildId || this.activeGuildId;
    if (!targetGuildId) {
      this.logger.error('Failed to change audio volume, no active guild');
      return;
    }
    
    const audioResource = this.audioResources.get(targetGuildId);
    if (!audioResource || !audioResource.volume) {
      this.logger.error(
        `Failed to change audio volume for guild ${targetGuildId}, AudioResource or volume was undefined`,
      );
      return;
    }
    audioResource.volume.setVolume(volume);
  }

  playResource(resource: AudioResource, name: string, url: string, guildId?: string) {
    const targetGuildId = guildId || this.activeGuildId;
    if (!targetGuildId) {
      this.logger.error('Failed to play resource, no active guild');
      return;
    }
    
    this.logger.debug(
      `Playing audio resource for guild ${targetGuildId} with volume ${resource.volume?.volume} (${resource.playbackDuration}) (readable: ${resource.readable})`,
    );
    
    const audioPlayer = this.getOrCreateAudioPlayer(targetGuildId);
    audioPlayer.play(resource);
    
    this.audioResources.set(targetGuildId, resource);
    resource.volume?.setVolume(this.playbackService.getVolume());

    const isPlayable = this.audioPlayer?.checkPlayable();
    if (isPlayable) {
      return;
    }

    this.logger.warn(
      `Bot attempted to play '${name}' but the resource is non-playable.
      This means that the audio format is unsupported, the Jellyfin server has encountered an error or there is a bug.
      The application will attempt to obtain a clear text error message from the server.
      This may take a moment`,
    );

    fetch(url)
      .then(async (response) => {
        this.logger.debug(
          `Received response from Jellyfin server to troubleshoot non-playable resource with status ${response.status}`,
        );

        // Reading the full body is only useful for text/JSON error pages. For
        // media (audio/ogg, audio/mpeg, ...) or any other binary the body would
        // be dumped as a huge, unreadable blob, which helps nobody. So we only
        // log textual bodies, truncated, and otherwise just the content type.
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('text') || contentType.includes('json')) {
          const text = await response.text().catch(() => '');
          const snippet =
            text.length > 500 ? `${text.slice(0, 500)}… (truncated)` : text;
          this.logger.warn(
            `Clear text message from Jellyfin (${contentType}): ${snippet}`,
          );
        } else {
          this.logger.warn(
            `Response from Jellyfin server is not a text error (content-type: ${contentType}). ` +
              'The resource may still become playable once buffering completes.',
          );
        }
      })
      .catch((e: Error) => {
        this.logger.error(
          `Unable to connect to Jellyfin server to check resource playability. This indicates a more serious issue: '${e.message}'`,
        );
      });
  }

  /**
   * Pauses the current audio player for a specific guild
   * @param guildId The guild ID to pause playback for
   */
  @OnEvent(EventNames.Controls.Pause)
  pause(guildId?: string) {
    const targetGuildId = guildId || this.activeGuildId;
    if (!targetGuildId) {
      this.logger.error('Failed to pause, no active guild');
      return;
    }
    
    const audioPlayer = this.getOrCreateAudioPlayer(targetGuildId);
    audioPlayer.pause();
    const track = this.playbackService.getPlaylistOrDefault().getActiveTrack();
    if (track) {
      track.playing = false;
    }
    this.eventEmitter.emit(EventNames.Circuit.Paused, true);
  }

  /**
   * Stops the audio player for a specific guild
   * @param force Whether to force stop
   * @param guildId The guild ID to stop playback for
   * @returns Whether the audio player was stopped
   */
  @OnEvent(EventNames.Controls.Stop)
  stop(force: boolean, guildId?: string): boolean {
    const targetGuildId = guildId || this.activeGuildId;
    if (!targetGuildId) {
      this.logger.error('Failed to stop, no active guild');
      return false;
    }
    
    const audioPlayer = this.getOrCreateAudioPlayer(targetGuildId);
    const hasStopped = audioPlayer.stop(force);
    if (hasStopped) {
      const playlist = this.playbackService.getPlaylistOrDefault();
      this.eventEmitter.emit(
        EventNames.Circuit.FinishedTrack,
        playlist.getActiveTrack(),
      );
      playlist.clear();
    }
    return hasStopped;
  }

  /**
   * Unpauses the current audio player for a specific guild
   * @param guildId The guild ID to unpause playback for
   */
  unpause(guildId?: string) {
    const targetGuildId = guildId || this.activeGuildId;
    if (!targetGuildId) {
      this.logger.error('Failed to unpause, no active guild');
      return;
    }
    
    const audioPlayer = this.getOrCreateAudioPlayer(targetGuildId);
    audioPlayer.unpause();
    const track = this.playbackService.getPlaylistOrDefault().getActiveTrack();
    if (track) {
      track.playing = true;
    }
    this.eventEmitter.emit(EventNames.Circuit.Paused, false);
  }

  /**
   * Check if the current state is paused for a specific guild
   * @param guildId The guild ID to check
   * @returns The current pause state as a boolean
   */
  isPaused(guildId?: string): boolean {
    const targetGuildId = guildId || this.activeGuildId;
    if (!targetGuildId) {
      this.logger.error('Failed to check pause state, no active guild');
      return false;
    }
    
    const audioPlayer = this.audioPlayers.get(targetGuildId);
    if (!audioPlayer) {
      return false;
    }
    return audioPlayer.state.status === AudioPlayerStatus.Paused;
  }

  getVoiceChannelInfo(guildId?: string) {
    if (guildId) {
      return this.voiceChannelInfos.get(guildId);
    }
    if (this.activeGuildId) {
      return this.voiceChannelInfos.get(this.activeGuildId);
    }
    return null;
  }

  leaveChannel(guildId?: string) {
    const targetGuildId = guildId || this.activeGuildId;
    if (!targetGuildId) {
      this.logger.error('Failed to leave channel, no active guild');
      return;
    }
    
    this.leaveGuildChannel(targetGuildId);
  }
  
  /**
   * Leave the voice channel for a specific guild
   * @param guildId The guild ID to leave
   */
  leaveGuildChannel(guildId: string) {
    const voiceConnection = this.voiceConnections.get(guildId);
    if (!voiceConnection) {
      this.logger.debug(`No voice connection found for guild ${guildId}`);
      return;
    }
    
    this.stop(true, guildId);
    voiceConnection.disconnect();
    this.audioPlayers.delete(guildId);
    this.voiceConnections.delete(guildId);
    this.audioResources.delete(guildId);
    this.voiceChannelInfos.delete(guildId);
    
    if (this.activeGuildId === guildId) {
      this.activeGuildId = null;
    }
    
    this.logger.debug(`Left voice channel for guild ${guildId}`);
  }

  joinChannel(
    guildId: string,
    channelId: string,
    adapterCreator: Parameters<typeof joinVoiceChannel>[0]['adapterCreator'],
  ) {
    this.leaveGuildChannel(guildId);
    joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator,
    });
    
    const voiceConnection = getVoiceConnection(guildId);
    this.voiceConnections.set(guildId, voiceConnection);
    this.activeGuildId = guildId;
    
    voiceConnection.on(VoiceConnectionStatus.Disconnected, () => {
      const existingConnection = this.voiceConnections.get(guildId);
      if (existingConnection !== undefined) {
        this.playbackService.getPlaylistOrDefault().clear();
        this.leaveGuildChannel(guildId);
      }
    });
  }

  /**
   * Checks if the current state is paused or not and toggles the states to the opposite.
   * @param guildId The guild ID to toggle pause for
   * @returns The new paused state - true: paused, false: unpaused
   */
  @OnEvent(EventNames.Controls.TogglePause)
  togglePaused(guildId?: string): boolean {
    if (this.isPaused(guildId)) {
      this.unpause(guildId);
      return false;
    }

    this.pause(guildId);
    return true;
  }

  disconnect(guildId?: string): TryResult<
    string | MessagePayload | InteractionEditReplyOptions
  > {
    const targetGuildId = guildId || this.activeGuildId;
    
    if (!targetGuildId || !this.voiceConnections.has(targetGuildId)) {
      return {
        success: false,
        reply: {
          embeds: [
            buildErrorMessage({
              title: 'Unable to disconnect from voice channel',
              description: 'I am currently not connected to any voice channels',
            }),
          ],
        },
      };
    }

    const voiceConnection = this.voiceConnections.get(targetGuildId);
    if (voiceConnection) {
      voiceConnection.disconnect();
    }
    
    this.audioPlayers.delete(targetGuildId);
    this.voiceConnections.delete(targetGuildId);
    this.audioResources.delete(targetGuildId);
    this.voiceChannelInfos.delete(targetGuildId);
    
    if (this.activeGuildId === targetGuildId) {
      this.activeGuildId = null;
    }
    
    return {
      success: true,
      reply: {},
    };
  }

  disconnectGracefully() {
    this.logger.debug(
      `Disconnecting gracefully from ${this.voiceConnections.size} connections`,
    );
    
    for (const [guildId, connection] of this.voiceConnections) {
      this.logger.debug(`Disconnecting from guild ${guildId}`);
      connection.disconnect();
    }
    
    this.voiceConnections.clear();
    this.audioPlayers.clear();
    this.audioResources.clear();
    this.voiceChannelInfos.clear();
    this.autoLeaveIntervalIds.clear();
    this.activeGuildId = null;
  }
  
  /**
   * Disconnect all voice connections
   */
  disconnectAllGuilds() {
    this.logger.debug(
      `Disconnecting all guilds from ${this.voiceConnections.size} connections`,
    );
    
    for (const [guildId, connection] of this.voiceConnections) {
      this.logger.debug(`Disconnecting from guild ${guildId}`);
      connection.disconnect();
    }
    
    this.voiceConnections.clear();
    this.audioPlayers.clear();
    this.audioResources.clear();
    this.voiceChannelInfos.clear();
    this.autoLeaveIntervalIds.clear();
    this.activeGuildId = null;
  }

  private getOrCreateAudioPlayer(guildId: string): AudioPlayer {
    const voiceConnection = this.voiceConnections.get(guildId);
    if (voiceConnection === undefined) {
      throw new Error(
        `Voice connection for guild ${guildId} has not been initialized and audio player can't be created`,
      );
    }

    let audioPlayer = this.audioPlayers.get(guildId);
    
    if (audioPlayer === undefined) {
      this.logger.debug(
        `Initialized new instance of AudioPlayer for guild ${guildId} because it has not been defined yet`,
      );
      audioPlayer = createAudioPlayer({
        debug: process.env.DEBUG?.toLowerCase() === 'true',
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });
      this.audioPlayers.set(guildId, audioPlayer);
      this.attachEventListenersToAudioPlayer(guildId, audioPlayer);
      voiceConnection.subscribe(audioPlayer);
    }

    return audioPlayer;
  }

  private attachEventListenersToAudioPlayer(guildId: string, audioPlayer: AudioPlayer) {
    const voiceConnection = this.voiceConnections.get(guildId);
    
    if (!voiceConnection) {
      this.logger.error(
        `Unable to attach listener events for guild ${guildId}, because the VoiceConnection was undefined`,
      );
      return;
    }

    if (!audioPlayer) {
      this.logger.error(
        `Unable to attach listener events for guild ${guildId}, because the AudioPlayer was undefined`,
      );
      return;
    }

    voiceConnection.on('debug', (message) => {
      this.logger.debug(`Voice connection debug for guild ${guildId}`, message);
    });
    voiceConnection.on('error', (err) => {
      this.logger.error(`Voice connection error for guild ${guildId}`, err);
    });

    audioPlayer.on('debug', (message) => {
      this.logger.debug(`Audio player debug for guild ${guildId}`, message);
    });
    audioPlayer.on('error', (message) => {
      this.logger.error(`Audio player error for guild ${guildId}`, message);
    });
    audioPlayer.on('stateChange', (previousState) => {
      if (!this.audioPlayer) {
        this.logger.error(
          'Unable to process state change from audio player, because the current audio player in the callback was undefined',
        );
        return;
      }

      this.logger.debug(
        `Audio player changed state from ${previousState.status} to ${this.audioPlayer.state.status}`,
      );

      if (previousState.status !== AudioPlayerStatus.Playing) {
        return;
      }

      if (audioPlayer.state.status !== AudioPlayerStatus.Idle) {
        return;
      }

      this.logger.debug(`Audio player for guild ${guildId} finished playing old resource`);

      const playlist = this.playbackService.getPlaylistOrDefault();
      const finishedTrack = playlist.getActiveTrack();

      if (finishedTrack) {
        finishedTrack.playing = false;
        this.eventEmitter.emit(EventNames.Circuit.FinishedTrack, finishedTrack);
      }

      const hasNextTrack = playlist.hasNextTrackInPlaylist();

      this.logger.debug(
        `Playlist for guild ${guildId} has next track: ${hasNextTrack ? 'yes' : 'no'}`,
      );

      if (!hasNextTrack) {
        this.logger.debug(`Reached the end of the playlist for guild ${guildId}`);
        return;
      }

      this.playbackService.getPlaylistOrDefault().setNextTrackAsActiveTrack();
    });
  }

  @Interval(500)
  private checkAudioResourcePlayback() {
    // Check all active audio resources across all guilds
    for (const [guildId, audioResource] of this.audioResources) {
      if (!audioResource) {
        continue;
      }

      const playlist = this.playbackService.getPlaylistOrDefault();

      if (!playlist) {
        this.logger.error(
          `Failed to update elapsed audio time for guild ${guildId} because playlist was unexpectedly undefined`,
        );
        continue;
      }

      const activeTrack = playlist.getActiveTrack();

      if (!activeTrack) {
        continue;
      }

      activeTrack.updatePlaybackProgress(audioResource.playbackDuration);
      this.logger.debug(
        `Reporting progress for guild ${guildId}: ${audioResource.playbackDuration} on track ${activeTrack.id}`,
      );
    }
  }
}
