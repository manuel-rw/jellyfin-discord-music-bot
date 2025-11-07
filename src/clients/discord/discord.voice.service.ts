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

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '@nestjs/common/services';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';

import {
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  MessagePayload,
  VoiceChannel,
} from 'discord.js';

import { TryResult } from '../../models/TryResult';
import { Track } from '../../models/music/Track';
import { PlaybackService } from '../../playback/playback.service';
import { JellyfinStreamBuilderService } from '../jellyfin/jellyfin.stream.builder.service';
import { JellyfinWebSocketService } from '../jellyfin/jellyfin.websocket.service';

import { DiscordMessageService } from './discord.message.service';

@Injectable()
export class DiscordVoiceService implements OnModuleDestroy {
  private readonly logger = new Logger(DiscordVoiceService.name);
  private audioPlayer: AudioPlayer | undefined;
  private voiceConnection: VoiceConnection | undefined;
  private audioResource: AudioResource | undefined;
  private autoLeaveIntervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly playbackService: PlaybackService,
    private readonly jellyfinWebSocketService: JellyfinWebSocketService,
    private readonly jellyfinStreamBuilder: JellyfinStreamBuilderService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // ✅ Log confirmation that persistent volume logic is active
    this.logger.debug('🔁 Persistent volume integration active.');
  }


  onModuleDestroy() {
    if (this.autoLeaveIntervalId) {
      try {
        clearInterval(this.autoLeaveIntervalId);
        this.autoLeaveIntervalId = null;
        this.logger.debug('autoLeaveIntervalId Cleared');
      } catch (error) {
        this.logger.error(`Error while clearing autoLeaveIntervalId: ${error}`);
      }
    }
  }

  @OnEvent('internal.audio.track.announce')
  handleOnNewTrack(track: Track) {
    // Create the audio resource with inline volume support
    const resource = createAudioResource(
      track.getStreamUrl(this.jellyfinStreamBuilder),
      {
        inlineVolume: true,
      },
    );

    // Apply persisted volume from PlaybackService
    try {
      const volume = this.playbackService.getVolume();
      if (resource.volume) {
        resource.volume.setVolume(volume);
        this.logger.debug(`🎚️ Applied persistent volume: ${(volume * 100).toFixed(0)}%`);
      } else {
        this.logger.warn('⚠️ Resource has no volume control available.');
      }
    } catch (err) {
      this.logger.error(`❌ Failed to apply persistent volume: ${err}`);
    }

    // Start playback
    this.playResource(resource);
  }

  tryJoinChannelAndEstablishVoiceConnection(
    member: GuildMember,
  ): TryResult<InteractionEditReplyOptions> {
    if (this.voiceConnection !== undefined) {
      this.logger.debug(
        'Avoided joining the voice channel because voice connection is already defined',
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
            this.discordMessageService.buildMessage({
              title: 'Unable to join your channel',
              description:
                "I am unable to join your channel, because you don't seem to be in a voice channel. Connect to a channel first to use this command",
            }),
          ],
        },
      };
    }

    const channel = member.voice.channel;

    joinVoiceChannel({
      channelId: channel.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      guildId: channel.guildId,
    });

    this.jellyfinWebSocketService.initializeAndConnect();

    if (this.voiceConnection === undefined) {
      this.voiceConnection = getVoiceConnection(member.guild.id);
    }
    this.voiceConnection?.on(VoiceConnectionStatus.Disconnected, () => {
      if (this.voiceConnection !== undefined) {
        this.playbackService.getPlaylistOrDefault().clear();
        this.disconnect();
      }
    });

    const voiceChannelId = channel.id;
    this.autoLeaveIntervalId = setInterval(async () => {
      // 🧩 Early exit if disconnected
      if (!this.voiceConnection) {
        clearInterval(this.autoLeaveIntervalId!);
        this.autoLeaveIntervalId = null;
        this.logger.debug('🧹 Auto-leave interval stopped (no active voice connection).');
        return;
      }

      // Check if the channel still exists
      const voiceChannel = (await member.guild.channels.fetch(voiceChannelId)) as VoiceChannel | undefined;
      if (!voiceChannel) {
        clearInterval(this.autoLeaveIntervalId!);
        this.autoLeaveIntervalId = null;
        this.logger.debug('🧹 Auto-leave interval stopped (channel no longer exists).');
        return;
      }

      // Ignore if there are still non-bot members in the voice channel
      const voiceChannelMembersExpectBots = voiceChannel.members.filter(m => !m.user.bot);
      if (voiceChannelMembersExpectBots.size > 0) return;

      try {
        this.stop(true);
        this.disconnect();
        clearInterval(this.autoLeaveIntervalId!);
        this.autoLeaveIntervalId = null;
        this.logger.debug(`👋 Disconnected from empty channel in guild "${member.guild.name}"`);
      } catch (error: any) {
        this.logger.warn(`⚠️ Suppressed disconnect error: ${error.message}`);
      }
    }, 5000);


    return {
      success: true,
      reply: {},
    };
  }

  changeVolume(volume: number) {
    if (!this.audioResource || !this.audioResource.volume) {
      this.logger.error(
        'Failed to change audio volume, AudioResource or volume was undefined',
      );
      return;
    }
    this.audioResource.volume.setVolume(volume);
  }

  playResource(resource: AudioResource<unknown>) {
    this.logger.debug(
      `Playing audio resource with volume ${resource.volume?.volume} (${resource.playbackDuration}) (readable: ${resource.readable}) (volume: ${resource.volume?.volume} (${resource.volume?.volumeDecibels}dB)) (silence remaining: ${resource.silenceRemaining}) (silence padding frames: ${resource.silencePaddingFrames}) (metadata: ${resource.metadata})`,
    );
    this.createAndReturnOrGetAudioPlayer().play(resource);
    this.audioResource = resource;

    const isPlayable = this.audioPlayer?.checkPlayable();
    if (isPlayable) {
      return;
    }
    this.logger.warn(
      `Current resource is is not playable. This means playback will get stuck. Please report this issue.`,
    );
  }

  /**
   * Pauses the current audio player
   */
  @OnEvent('internal.voice.controls.pause')
  pause() {
    this.createAndReturnOrGetAudioPlayer().pause();
    const track = this.playbackService.getPlaylistOrDefault().getActiveTrack();
    if (track) {
      track.playing = false;
    }
    this.eventEmitter.emit('playback.state.pause', true);
  }

  /**
   * Stops the audio player
   */
  @OnEvent('internal.voice.controls.stop')
  stop(force: boolean): boolean {
    const hasStopped = this.createAndReturnOrGetAudioPlayer().stop(force);
    if (hasStopped) {
      const playlist = this.playbackService.getPlaylistOrDefault();
      this.eventEmitter.emit(
        'internal.audio.track.finish',
        playlist.getActiveTrack(),
      );
      playlist.clear();
    }
    return hasStopped;
  }

  /**
   * Unpauses the current audio player
   */
  unpause() {
    this.createAndReturnOrGetAudioPlayer().unpause();
    const track = this.playbackService.getPlaylistOrDefault().getActiveTrack();
    if (track) {
      track.playing = true;
    }
    this.eventEmitter.emit('playback.state.pause', false);
  }

  /**
   * Check if the current state is paused
   * @returns The current pause state as a boolean
   */
  isPaused() {
    return (
      this.createAndReturnOrGetAudioPlayer().state.status ===
      AudioPlayerStatus.Paused
    );
  }

  /**
   * Checks if the current state is paused or not and toggles the states to the opposite.
   * @returns The new paused state - true: paused, false: un-paused
   */
  @OnEvent('internal.voice.controls.togglePause')
  togglePaused(): boolean {
    if (this.isPaused()) {
      this.unpause();
      return false;
    }

    this.pause();
    return true;
  }

  disconnect(): TryResult<string | MessagePayload | InteractionEditReplyOptions> {
    // 🧩 1️⃣ Early exit if already disconnected
    if (!this.voiceConnection) {
      this.logger.debug('🔇 No active voice connection to disconnect — skipping.');
      return {
        success: false,
        reply: {},
      };
    }

    // 🧩 2️⃣ Clear any lingering auto-leave interval
    if (this.autoLeaveIntervalId) {
      clearInterval(this.autoLeaveIntervalId);
      this.autoLeaveIntervalId = null;
      this.logger.debug('🧹 Cleared auto-leave interval before disconnecting.');
    }

    try {
      // 🧩 3️⃣ Gracefully disconnect
      this.voiceConnection.disconnect();
      this.logger.debug(`👋 Disconnected from voice channel in guild.`);

      // 🧩 4️⃣ Clean up references
      this.audioPlayer = undefined;
      this.voiceConnection = undefined;
      this.audioResource = undefined;

      // 🧩 5️⃣ Reset playlist
      this.playbackService.getPlaylistOrDefault().clear();

      return {
        success: true,
        reply: {},
      };
    } catch (err: any) {
      this.logger.error(`❌ Error during disconnect: ${err.message || err}`);
      return {
        success: false,
        reply: {
          embeds: [
            this.discordMessageService.buildErrorMessage({
              title: 'Error while disconnecting',
              description: `An unexpected issue occurred: ${err.message || err}`,
            }),
          ],
        },
      };
    }
  }

  disconnectGracefully() {
    const connections = getVoiceConnections();
    this.logger.debug(
      `Disconnecting gracefully from ${
        Object.keys(connections).length
      } connections`,
    );

    connections.forEach((connection) => {
      connection.disconnect();
    });
  }

  private createAndReturnOrGetAudioPlayer() {
    if (this.voiceConnection === undefined) {
      throw new Error(
        'Voice connection has not been initialized and audio player can\t be created',
      );
    }

    if (this.audioPlayer === undefined) {
      this.logger.debug(
        'Initialized new instance of AudioPlayer because it has not been defined yet',
      );
      this.audioPlayer = createAudioPlayer({
        debug: process.env.DEBUG?.toLowerCase() === 'true',
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });
      this.attachEventListenersToAudioPlayer();
      this.voiceConnection.subscribe(this.audioPlayer);
      return this.audioPlayer;
    }

    return this.audioPlayer;
  }

  private attachEventListenersToAudioPlayer() {
    if (!this.voiceConnection) {
      this.logger.error(
        'Unable to attach listener events, because the VoiceConnection was undefined',
      );
      return;
    }

    if (!this.audioPlayer) {
      this.logger.error(
        'Unable to attach listener events, because the AudioPlayer was undefined',
      );
      return;
    }

    this.voiceConnection.on('debug', (message) => {
      this.logger.debug('Voice connection debug', message);
    });
    this.voiceConnection.on('error', (err) => {
      this.logger.error('Voice connection error', err);
    });

    this.audioPlayer.on('debug', (message) => {
      this.logger.debug('Audio player debug', message);
    });
    this.audioPlayer.on('error', (message) => {
      this.logger.error('Audio player error', message);
    });
    this.audioPlayer.on('stateChange', (previousState) => {
      if (!this.audioPlayer) {
        this.logger.debug('StateChange fired after player cleanup — safe to ignore.');
        return;
      }

      this.logger.debug(
        `Audio player changed state from ${previousState.status} to ${this.audioPlayer.state.status}`,
      );

      if (previousState.status !== AudioPlayerStatus.Playing) {
        return;
      }

      if (this.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
        return;
      }

      this.logger.debug('Audio player finished playing old resource');

      const playlist = this.playbackService.getPlaylistOrDefault();
      const finishedTrack = playlist.getActiveTrack();

      if (finishedTrack) {
        finishedTrack.playing = false;
        this.eventEmitter.emit('internal.audio.track.finish', finishedTrack);
      }

      const hasNextTrack = playlist.hasNextTrackInPlaylist();

      this.logger.debug(
        `Playlist has next track: ${hasNextTrack ? 'yes' : 'no'}`,
      );

      if (!hasNextTrack) {
        this.logger.debug('Reached the end of the playlist');
        return;
      }

      this.playbackService.getPlaylistOrDefault().setNextTrackAsActiveTrack();
    });
  }

  @Interval(500)
  private checkAudioResourcePlayback() {
    if (!this.audioResource) {
      return;
    }

    const playlist = this.playbackService.getPlaylistOrDefault();

    if (!playlist) {
      this.logger.error(
        'Failed to update elapsed audio time because playlist was unexpectedly undefined',
      );
      return;
    }

    const activeTrack = playlist.getActiveTrack();

    if (!activeTrack) {
      return;
    }

    activeTrack.updatePlaybackProgress(this.audioResource.playbackDuration);
    this.logger.debug(
      `Reporting progress: ${this.audioResource.playbackDuration} on track ${activeTrack.id} (ended: ${this.audioResource.ended}) (started: ${this.audioResource.started}) (silence remaining: ${this.audioResource.silenceRemaining})`,
    );
  }
}
