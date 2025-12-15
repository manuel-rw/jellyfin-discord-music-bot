import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common';

import { CommandInteraction } from 'discord.js';

import { buildMessage } from '../clients/discord/discord.message.builder';
import { defaultMemberPermissions } from '../utils/environment';

@Injectable()
@Command({
  name: 'help',
  description: 'Get help if you&apos;re having problems with this bot',
  defaultMemberPermissions,
})
export class HelpCommand {
  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    await interaction.reply({
      embeds: [
        buildMessage({
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
