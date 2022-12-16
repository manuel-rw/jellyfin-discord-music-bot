import { TransformPipe } from '@discord-nestjs/common';

import {
  Command,
  DiscordTransformedCommand,
  InjectDiscordClient,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import { EmbedBuilder } from '@discordjs/builders';
import { Client, InteractionReplyOptions } from 'discord.js';
import { DefaultJellyfinColor } from 'src/types/colors';

@Command({
  name: 'status',
  description: 'Display the current status for troubleshooting',
})
@UsePipes(TransformPipe)
export class StatusCommand implements DiscordTransformedCommand<unknown> {
  constructor(
    @InjectDiscordClient()
    private readonly client: Client,
  ) {}

  handler(
    dto: unknown,
    executionContext: TransformedCommandExecutionContext<any>,
  ): InteractionReplyOptions {
    const ping = this.client.ws.ping;

    return {
      embeds: [
        new EmbedBuilder()
          .setTitle('Online and ready')
          .setColor(DefaultJellyfinColor)
          .addFields([
            {
              name: 'Ping',
              value: `${ping}ms`,
              inline: true,
            },
            {
              name: 'Source code',
              value: 'https://github.com/manuel-rw/jellyfin-discord-music-bot',
              inline: true,
            },
          ])
          .toJSON(),
      ],
    };
  }
}
