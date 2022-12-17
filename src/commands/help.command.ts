import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { CommandInteraction } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { GenericCustomReply } from '../models/generic-try-handler';

@Command({
  name: 'help',
  description: 'Get help if you&apos;re having problems with this bot',
})
@UsePipes(TransformPipe)
export class HelpCommand implements DiscordCommand {
  constructor(private readonly discordMessageService: DiscordMessageService) {}

  handler(commandInteraction: CommandInteraction): GenericCustomReply {
    return {
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'a',
          description:
            'Jellyfin Discord Bot is an open source and self-hosted Discord bot, that integrates with your Jellyfin Media server and enables you to playback music from your libraries. You can use the Discord Slash Commands to invoke bot commands.',
          mixin(embedBuilder) {
            return embedBuilder
              .setAuthor({
                name: 'Jellyfin Discord Bot',
                iconURL:
                  'https://github.com/walkxcode/dashboard-icons/blob/main/png/jellyfin.png?raw=true',
                url: 'https://github.com/manuel-rw/jellyfin-discord-music-bot',
              })
              .addFields([
                {
                  name: 'Report an issue',
                  value:
                    'https://github.com/manuel-rw/jellyfin-discord-music-bot/issues/new/choose',
                  inline: true,
                },
                {
                  name: 'Source code',
                  value:
                    'https://github.com/manuel-rw/jellyfin-discord-music-bot',
                  inline: true,
                },
              ]);
          },
        }),
      ],
    };
  }
}
