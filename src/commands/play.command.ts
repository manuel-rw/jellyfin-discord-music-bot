import { TransformPipe } from '@discord-nestjs/common';
import {
  Command,
  DiscordTransformedCommand,
  Payload,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import { InteractionReplyOptions, MessagePayload } from 'discord.js';

import { Injectable } from '@nestjs/common';
import { TrackRequestDto } from '../models/track-request.dto';
import {
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
} from '@discordjs/voice';
import { Logger } from '@nestjs/common/services';

@Command({
  name: 'play',
  description: 'Immediately play a track',
})
@Injectable()
@UsePipes(TransformPipe)
export class PlayCommand implements DiscordTransformedCommand<TrackRequestDto> {
  private readonly logger = new Logger(PlayCommand.name);

  handler(
    @Payload() dto: TrackRequestDto,
    executionContext: TransformedCommandExecutionContext<any>,
  ):
    | string
    | void
    | MessagePayload
    | InteractionReplyOptions
    | Promise<string | void | MessagePayload | InteractionReplyOptions> {
    const player = createAudioPlayer();

    this.logger.debug('bruh');

    player.on('error', (error) => {
      this.logger.error(error);
    });

    player.on('debug', (error) => {
      this.logger.debug(error);
    });

    const resource = createAudioResource(dto.search);

    const connection = getVoiceConnection(executionContext.interaction.guildId);

    connection.subscribe(player);

    player.play(resource);
    player.unpause();

    return 'Playing Audio...';
  }
}
