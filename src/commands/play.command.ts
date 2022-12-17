import { TransformPipe } from '@discord-nestjs/common';
import {
  Command,
  DiscordTransformedCommand,
  Payload,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import { GuildMember, InteractionReplyOptions } from 'discord.js';

import { createAudioResource } from '@discordjs/voice';
import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common/services';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { TrackRequestDto } from '../models/track-request.dto';

@Command({
  name: 'play',
  description: 'Immediately play a track',
})
@Injectable()
@UsePipes(TransformPipe)
export class PlayCommand implements DiscordTransformedCommand<TrackRequestDto> {
  private readonly logger = new Logger(PlayCommand.name);

  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordVoiceService: DiscordVoiceService,
  ) {}

  handler(
    @Payload() dto: TrackRequestDto,
    executionContext: TransformedCommandExecutionContext<any>,
  ):
    | string
    | InteractionReplyOptions
    | Promise<string | InteractionReplyOptions> {
    const guildMember = executionContext.interaction.member as GuildMember;

    const joinVoiceChannel =
      this.discordVoiceService.tryJoinChannelAndEstablishVoiceConnection(
        guildMember,
      );

    if (!joinVoiceChannel.success) {
      return joinVoiceChannel.reply;
    }

    this.discordVoiceService.playResource(createAudioResource(dto.search));

    return {
      embeds: [
        this.discordMessageService.buildMessage({
          title: `Playing ${dto.search}`,
        }),
      ],
    };
  }
}
