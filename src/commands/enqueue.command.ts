import { TransformPipe } from '@discord-nestjs/common';

import {
  Command,
  DiscordTransformedCommand,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import { InteractionReplyOptions } from 'discord.js';

@Command({
  name: 'enqueue',
  description: 'Enqueue a track to the current playlist',
})
@UsePipes(TransformPipe)
export class EnqueueCommand implements DiscordTransformedCommand<unknown> {
  handler(
    dto: unknown,
    executionContext: TransformedCommandExecutionContext<any>,
  ): InteractionReplyOptions | string {
    return 'nice';
  }
}
