import { TransformPipe } from '@discord-nestjs/common';

import {
  Command,
  DiscordTransformedCommand,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import { InteractionReplyOptions } from 'discord.js';

@Command({
  name: 'stop',
  description: 'Stop playback entirely and clear the current playlist',
})
@UsePipes(TransformPipe)
export class StopPlaybackCommand implements DiscordTransformedCommand<unknown> {
  handler(
    dto: unknown,
    executionContext: TransformedCommandExecutionContext<any>,
  ): InteractionReplyOptions | string {
    return 'nice';
  }
}
