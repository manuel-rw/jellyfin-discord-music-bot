import { TransformPipe } from '@discord-nestjs/common';

import {
  Command,
  DiscordTransformedCommand,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import { InteractionReplyOptions } from 'discord.js';

@Command({
  name: 'summon',
  description: 'Join your current voice channel',
})
@UsePipes(TransformPipe)
export class SummonCommand implements DiscordTransformedCommand<unknown> {
  handler(
    dto: unknown,
    executionContext: TransformedCommandExecutionContext<any>,
  ): InteractionReplyOptions | string {
    return 'nice';
  }
}
