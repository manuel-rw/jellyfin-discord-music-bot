import { TransformPipe } from '@discord-nestjs/common';

import {
  Command,
  CommandExecutionContext,
  DiscordCommand,
  DiscordTransformedCommand,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import {
  ButtonInteraction,
  CacheType,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  Interaction,
  InteractionReplyOptions,
  MessagePayload,
  StringSelectMenuInteraction,
} from 'discord.js';

@Command({
  name: 'pause',
  description: 'Pause or resume the playback of the current track',
})
@UsePipes(TransformPipe)
export class PausePlaybackCommand implements DiscordCommand {
  handler(
    interaction:
      | ChatInputCommandInteraction<CacheType>
      | ContextMenuCommandInteraction<CacheType>,
    executionContext: CommandExecutionContext<
      StringSelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>
    >,
  ): string | InteractionReplyOptions {
    return {
      content: 'test',
    };
  }
}
