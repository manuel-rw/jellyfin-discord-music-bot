import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { CommandInteraction } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';

@Command({
  name: 'help',
  description: 'Get help if you&apos;re having problems with this bot',
})
@UsePipes(TransformPipe)
export class HelpCommand implements DiscordCommand {
  constructor(private readonly discordMessageService: DiscordMessageService) {}

  async handler(interaction: CommandInteraction): Promise<void> {
    await interaction.reply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Jellyfin Discord Bot',
          description:
            'Jellyfin Discord Bot is an open source and self-hosted Discord bot, that integrates with your Jellyfin Media server and enables you to playback music from your libraries. You can use the Discord Slash Commands to invoke bot commands.',
          authorUrl: 'https://github.com/manuel-rw/jellyfin-discord-music-bot',
          mixin(embedBuilder) {
            return embedBuilder.addFields([
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
    });
  }
}
