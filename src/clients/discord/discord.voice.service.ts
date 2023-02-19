import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  getVoiceConnections,
  joinVoiceChannel,
  VoiceConnection,
} from '@discordjs/voice';

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common/services';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import { GuildMember } from 'discord.js';

import { JellyfinWebSocketService } from '../jellyfin/jellyfin.websocket.service';
import { GenericTryHandler } from '../../models/generic-try-handler';
import { PlaybackService } from '../../playback/playback.service';
import { Track } from '../../types/track';

import { DiscordMessageService } from './discord.message.service';

@Injectable()
export class DiscordVoiceService {
  private readonly logger = new Logger(DiscordVoiceService.name);
  private audioPlayer: AudioPlayer;
  private voiceConnection: VoiceConnection;

  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly playbackService: PlaybackService,
    private readonly jellyfinWebSocketService: JellyfinWebSocketService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('playback.newTrack')
  handleOnNewTrack(newTrack: Track) {
    const resource = createAudioResource(newTrack.streamUrl);
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
            this.discordMessageService.buildErrorMessage({
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

    if (this.voiceConnection == undefined) {
      this.voiceConnection = getVoiceConnection(member.guild.id);
    }

    return {
      success: true,
      reply: {},
    };
  }

  playResource(resource: AudioResource<unknown>) {
    this.createAndReturnOrGetAudioPlayer().play(resource);
  }

  /**
   * Pauses the current audio player
   */
  @OnEvent('playback.control.pause')
  pause() {
    this.createAndReturnOrGetAudioPlayer().pause();
    this.eventEmitter.emit('playback.state.pause', true);
  }

  /**
   * Stops the audio player
   */
  @OnEvent('playback.control.stop')
  stop(force: boolean): boolean {
    const stopped = this.createAndReturnOrGetAudioPlayer().stop(force);
    this.eventEmitter.emit('playback.state.stop');
    return stopped;
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
  @OnEvent('playback.control.togglePause')
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
    if (this.audioPlayer === undefined) {
      this.logger.debug(
        `Initialized new instance of Audio Player because it has not been defined yet`,
      );
      this.audioPlayer = createAudioPlayer();
      this.attachEventListenersToAudioPlayer();
      this.voiceConnection.subscribe(this.audioPlayer);
      return this.audioPlayer;
    }

    return this.audioPlayer;
  }

  private attachEventListenersToAudioPlayer() {
    this.audioPlayer.on('debug', (message) => {
      this.logger.debug(message);
    });
    this.audioPlayer.on('error', (message) => {
      this.logger.error(message);
    });
    this.audioPlayer.on('stateChange', (previousState) => {
      if (previousState.status !== AudioPlayerStatus.Playing) {
        return;
      }

      if (this.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
        return;
      }

      const hasNextTrack = this.playbackService
        .getPlaylistOrDefault()
        .hasNextTrackInPlaylist();

      this.logger.debug(
        `Deteced audio player status change from ${previousState.status} to ${
          this.audioPlayer.state.status
        }. Has next track: ${hasNextTrack ? 'yes' : 'no'}`,
      );

      if (!hasNextTrack) {
        this.logger.debug(`Audio Player has reached the end of the playlist`);
        return;
      }

      this.playbackService.getPlaylistOrDefault().setNextTrackAsActiveTrack();
    });
  }
}
