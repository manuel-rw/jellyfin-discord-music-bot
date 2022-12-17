import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { EmbedBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { DefaultJellyfinColor } from 'src/types/colors';
import { GenericCustomReply } from '../models/generic-try-handler';

@Command({
  name: 'help',
  description: 'Get help if you&apos;re having problems with this bot',
})
@UsePipes(TransformPipe)
export class HelpCommand implements DiscordCommand {
  handler(commandInteraction: CommandInteraction): GenericCustomReply {
    return {
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: 'Jellyfin Discord Bot',
            iconURL:
              'https://github.com/walkxcode/dashboard-icons/blob/main/png/jellyfin.png?raw=true',
            url: 'https://github.com/manuel-rw/jellyfin-discord-music-bot',
          })
          .setColor(DefaultJellyfinColor)
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
}
