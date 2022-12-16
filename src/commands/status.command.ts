import { TransformPipe } from '@discord-nestjs/common';

import {
  Command,
  DiscordTransformedCommand,
  InjectDiscordClient,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import { EmbedBuilder } from '@discordjs/builders';
import { Client, InteractionReplyOptions, Status } from 'discord.js';
import { DefaultJellyfinColor } from 'src/types/colors';

import { formatDuration, intervalToDuration } from 'date-fns';
import { Constants } from '../utils/constants';

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
    const status = Status[this.client.ws.status];

    const interval = intervalToDuration({
      start: this.client.uptime,
      end: 0,
    });
    const formattedDuration = formatDuration(interval);

    return {
      embeds: [
        new EmbedBuilder()
          .setTitle('Online and ready')
          .setColor(DefaultJellyfinColor)
          .addFields([
            {
              name: 'Version',
              value: Constants.Metadata.Version,
              inline: false,
            },
            {
              name: 'Ping',
              value: `${ping}ms`,
              inline: true,
            },
            {
              name: 'Status',
              value: `${status}`,
              inline: true,
            },
            {
              name: 'Uptime',
              value: `${formattedDuration}`,
              inline: true,
            },
          ])
          .toJSON(),
      ],
    };
  }
}
