import {
  AudioPlayer,
  AudioResource,
  createAudioPlayer,
  getVoiceConnection,
  getVoiceConnections,
  joinVoiceChannel,
  VoiceConnection,
} from '@discordjs/voice';
import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common/services';
import { GuildMember } from 'discord.js';
import { GenericTryHandler } from '../../models/generic-try-handler';
import { DiscordMessageService } from './discord.message.service';

@Injectable()
export class DiscordVoiceService {
  private readonly logger = new Logger(DiscordVoiceService.name);
  private audioPlayer: AudioPlayer;
  private voiceConnection: VoiceConnection;

  constructor(private readonly discordMessageService: DiscordMessageService) {}

  tryJoinChannelAndEstablishVoiceConnection(
    member: GuildMember,
  ): GenericTryHandler {
    if (this.voiceConnection !== undefined) {
      return {
        success: false,
        reply: {},
      };
    }

    if (member.voice.channel === null) {
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

  pause() {
    this.createAndReturnOrGetAudioPlayer().pause();
  }

  unpause() {
    this.createAndReturnOrGetAudioPlayer().unpause();
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
      this.audioPlayer.on('debug', (message) => {
        this.logger.debug(message);
      });
      this.audioPlayer.on('error', (message) => {
        this.logger.error(message);
      });
      this.voiceConnection.subscribe(this.audioPlayer);
      return this.audioPlayer;
    }

    return this.audioPlayer;
  }
}
