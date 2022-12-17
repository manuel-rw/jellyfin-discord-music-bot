import { TransformPipe } from '@discord-nestjs/common';

import {
  Command,
  DiscordTransformedCommand,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import { InteractionReplyOptions } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { TrackRequestDto } from '../models/track-request.dto';
import { PlaybackService } from '../playback/playback.service';

@Command({
  name: 'enqueue',
  description: 'Enqueue a track to the current playlist',
})
@UsePipes(TransformPipe)
export class EnqueueCommand
  implements DiscordTransformedCommand<TrackRequestDto>
{
  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly playbackService: PlaybackService,
  ) {}

  handler(
    dto: TrackRequestDto,
    executionContext: TransformedCommandExecutionContext<any>,
  ): InteractionReplyOptions | string {
    // const index = this.playbackService.eneuqueTrack({});
    const index = 0;
    return {
      embeds: [
        this.discordMessageService.buildMessage({
          title: `Track Added to queue`,
          description: `Your track \`\`${
            dto.search
          }\`\` was added to the queue at position \`\`${index + 1}\`\``,
        }),
      ],
    };
  }
}
