import { TransformPipe } from '@discord-nestjs/common';

import {
  Command,
  DiscordTransformedCommand,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import { InteractionReplyOptions } from 'discord.js';

@Command({
  name: 'disconnect',
  description: 'Join your current voice channel',
})
@UsePipes(TransformPipe)
export class DisconnectCommand implements DiscordTransformedCommand<unknown> {
  handler(
    dto: unknown,
    executionContext: TransformedCommandExecutionContext<any>,
  ): InteractionReplyOptions | string {
    return 'nice';
  }
}
