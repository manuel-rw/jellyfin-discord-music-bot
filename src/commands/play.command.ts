import { TransformPipe } from '@discord-nestjs/common';
import {
  Command,
  DiscordTransformedCommand,
  Payload,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import {
  EmbedBuilder,
  GuildMember,
  InteractionReplyOptions,
  MessagePayload,
} from 'discord.js';

import { Injectable } from '@nestjs/common';
import { TrackRequestDto } from '../models/track-request.dto';
import {
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
} from '@discordjs/voice';
import { Logger } from '@nestjs/common/services';
import { DiscordMessageService } from '../clients/discord/discord.message.service';

@Command({
  name: 'play',
  description: 'Immediately play a track',
})
@Injectable()
@UsePipes(TransformPipe)
export class PlayCommand implements DiscordTransformedCommand<TrackRequestDto> {
  private readonly logger = new Logger(PlayCommand.name);

  constructor(private readonly discordMessageService: DiscordMessageService) {}

  handler(
    @Payload() dto: TrackRequestDto,
    executionContext: TransformedCommandExecutionContext<any>,
  ):
    | string
    | void
    | MessagePayload
    | InteractionReplyOptions
    | Promise<string | void | MessagePayload | InteractionReplyOptions> {
    const guildMember = executionContext.interaction.member as GuildMember;

    if (guildMember.voice.channel === null) {
      return {
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'Unable to join your channel',
            description:
              'You are in a channel, I am either unabelt to connect to or you aren&apost in a channel yet',
          }),
        ],
      };
    }

    const channel = guildMember.voice.channel;

    joinVoiceChannel({
      channelId: channel.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      guildId: channel.guildId,
    });

    const connection = getVoiceConnection(executionContext.interaction.guildId);

    if (!connection) {
      return {
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'Unable to establish audio connection',
            description:
              'I was unable to establish an audio connection to your voice channel',
          }),
        ],
      };
    }

    const player = createAudioPlayer();

    const resource = createAudioResource(dto.search);

    connection.subscribe(player);

    player.play(resource);
    player.unpause();

    return {
      embeds: [new EmbedBuilder().setTitle(`Playing ${dto.search}`).toJSON()],
    };
  }
}
