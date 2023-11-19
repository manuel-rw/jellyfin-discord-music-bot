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
} from '@discordjs/voice';

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common/services';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';

import { GuildMember } from 'discord.js';

import { GenericTryHandler } from '../../models/generic-try-handler';
import { Track } from '../../models/shared/Track';
import { PlaybackService } from '../../playback/playback.service';
import { JellyfinStreamBuilderService } from '../jellyfin/jellyfin.stream.builder.service';
import { JellyfinWebSocketService } from '../jellyfin/jellyfin.websocket.service';

import { DiscordMessageService } from './discord.message.service';

@Injectable()
export class DiscordVoiceService {
  private readonly logger = new Logger(DiscordVoiceService.name);
  private audioPlayer: AudioPlayer | undefined;
  private voiceConnection: VoiceConnection | undefined;
  private audioResource: AudioResource | undefined;

  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly playbackService: PlaybackService,
    private readonly jellyfinWebSocketService: JellyfinWebSocketService,
    private readonly jellyfinStreamBuilder: JellyfinStreamBuilderService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('internal.audio.track.announce')
  handleOnNewTrack(track: Track) {
    const resource = createAudioResource(
      track.getStreamUrl(this.jellyfinStreamBuilder),
      {
        inlineVolume: true,
      },
    );
    this.playResource(resource);
  }

  tryJoinChannelAndEstablishVoiceConnection(
    member: GuildMember,
  ): GenericTryHandler {
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

    return {
      success: true,
      reply: {},
    };
  }

  changeVolume(volume: number) {
    if (!this.audioResource || !this.audioResource.volume) {
      this.logger.error(
        "Failed to change audio volume, AudioResource or volume was undefined",
      );
      return;
    }
    this.audioResource.volume.setVolume(volume);
  }

  playResource(resource: AudioResource<unknown>) {
    this.logger.debug(
      `Playing audio resource with volume ${
        resource.volume?.volume ?? 'unknown'
      }`,
    );
    this.createAndReturnOrGetAudioPlayer().play(resource);
    this.audioResource = resource;
  }

  /**
   * Pauses the current audio player
   */
  @OnEvent('internal.voice.controls.pause')
  pause() {
    this.createAndReturnOrGetAudioPlayer().pause();
    this.eventEmitter.emit('playback.state.pause', true);
  }

  /**
   * Stops the audio player
   */
  @OnEvent('internal.voice.controls.stop')
  stop(force: boolean): boolean {
    return this.createAndReturnOrGetAudioPlayer().stop(force);
  }

  /**
   * Unpauses the current audio player
   */
  unpause() {
    this.createAndReturnOrGetAudioPlayer().unpause();
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
   * Gets the current audio player status
   * @returns The current audio player status
   */
  getPlayerStatus(): AudioPlayerStatus {
    return this.createAndReturnOrGetAudioPlayer().state.status;
  }

  /**
   * Checks if the current state is paused or not and toggles the states to the opposite.
   * @returns The new paused state - true: paused, false: unpaused
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

  disconnect(): GenericTryHandler {
    if (this.voiceConnection === undefined) {
      return {
        success: false,
        reply: {
          embeds: [
            this.discordMessageService.buildErrorMessage({
              title: 'Unable to disconnect from voice channel',
              description: 'I am currently not connected to any voice channels',
            }),
          ],
        },
      };
    }

    this.voiceConnection.destroy();
    this.voiceConnection = undefined;
    return {
      success: true,
      reply: {},
    };
  }

  disconnectGracefully() {
    const connections = getVoiceConnections();
    this.logger.debug(
      `Disonnecting gracefully from ${
        Object.keys(connections).length
      } connections`,
    );

    connections.forEach((connection) => {
      connection.destroy();
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
        "Unable to attach listener events, because the VoiceConnection was undefined",
      );
      return;
    }

    if (!this.audioPlayer) {
      this.logger.error(
        "Unable to attach listener events, because the AudioPlayer was undefined",
      );
      return;
    }

    this.voiceConnection.on('debug', (message) => {
      if (process.env.DEBUG?.toLowerCase() !== 'true') {
        return;
      }
      this.logger.debug(message);
    });
    this.voiceConnection.on('error', (err) => {
      this.logger.error(`Voice connection error: ${err}`);
    });

    this.audioPlayer.on('debug', (message) => {
      this.logger.debug(message);
    });
    this.audioPlayer.on('error', (message) => {
      this.logger.error(message);
    });
    this.audioPlayer.on('stateChange', (previousState) => {
      if (!this.audioPlayer) {
        this.logger.error(
          "Unable to process state change from audio player, because the current audio player in the callback was undefined",
        );
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

    const progress = this.audioResource.playbackDuration;

    const playlist = this.playbackService.getPlaylistOrDefault();

    if (!playlist) {
      this.logger.error(
        "Failed to update ellapsed audio time because playlist was unexpectitly undefined",
      );
      return;
    }

    const activeTrack = playlist.getActiveTrack();

    if (!activeTrack) {
      return;
    }

    activeTrack.updatePlaybackProgress(progress);
    this.logger.verbose(
      `Reporting progress: ${progress} on track ${activeTrack.id}`,
    );
  }
}
