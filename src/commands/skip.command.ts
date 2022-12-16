import { TransformPipe } from '@discord-nestjs/common';

import {
  Command,
  DiscordTransformedCommand,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import { InteractionReplyOptions } from 'discord.js';

@Command({
  name: 'skip',
  description: 'Skip the current track',
})
@UsePipes(TransformPipe)
export class SkipTrackCommand implements DiscordTransformedCommand<unknown> {
  handler(
    dto: unknown,
    executionContext: TransformedCommandExecutionContext<any>,
  ): InteractionReplyOptions | string {
    return 'nice';
  }
}
