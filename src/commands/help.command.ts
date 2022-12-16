import { TransformPipe } from '@discord-nestjs/common';

import {
  Command,
  DiscordTransformedCommand,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import { EmbedBuilder } from '@discordjs/builders';
import { InteractionReplyOptions, MessagePayload } from 'discord.js';

@Command({
  name: 'help',
  description: 'ejifejf',
})
@UsePipes(TransformPipe)
export class HelpCommand implements DiscordTransformedCommand<unknown> {
  handler(
    dto: unknown,
    executionContext: TransformedCommandExecutionContext<any>,
  ):
    | string
    | void
    | MessagePayload
    | InteractionReplyOptions
    | Promise<string | void | MessagePayload | InteractionReplyOptions> {
    return {
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: 'Jellyfin Discord Bot',
            iconURL:
              'https://github.com/walkxcode/dashboard-icons/blob/main/png/jellyfin.png?raw=true',
            url: 'https://github.com/manuel-rw/jellyfin-discord-music-bot',
          })
          .setTitle('Help Information')
          .setDescription(
            'Jellyfin Discord Music bot is an easy way to broadcast your music collection to a Discord voicechannel.',
          )
          .addFields([
            {
              name: 'Report an issue',
              value:
                'https://github.com/manuel-rw/jellyfin-discord-music-bot/issues/new/choose',
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

  /*
  handler(
    dto: unknown,
    executionContext: TransformedCommandExecutionContext<any>,
  ) {
    return new EmbedBuilder()
      .setAuthor({
        name: 'Jellyfin Discord Bot',
        iconURL:
          'https://github.com/walkxcode/dashboard-icons/blob/main/png/jellyfin.png?raw=true',
        url: 'https://github.com/manuel-rw/jellyfin-discord-music-bot',
      })
      .setTitle('Help Information')
      .setDescription(
        'Jellyfin Discord Music bot is an easy way to broadcast your music collection to a Discord voicechannel.',
      )
      .addFields([
        {
          name: 'Report an issue',
          value:
            'https://github.com/manuel-rw/jellyfin-discord-music-bot/issues/new/choose',
          inline: true,
        },
        {
          name: 'Source code',
          value: 'https://github.com/manuel-rw/jellyfin-discord-music-bot',
          inline: true,
        },
      ])
      .toJSON();
  }
  */
}
