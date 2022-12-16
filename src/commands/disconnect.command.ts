import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import {
  CommandInteraction,
  EmbedBuilder,
  InteractionReplyOptions,
} from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { DefaultJellyfinColor, ErrorJellyfinColor } from '../types/colors';

@Command({
  name: 'disconnect',
  description: 'Join your current voice channel',
})
@UsePipes(TransformPipe)
export class DisconnectCommand implements DiscordCommand {
  handler(interaction: CommandInteraction): InteractionReplyOptions | string {
    const connection = getVoiceConnection(interaction.guildId);

    if (!connection) {
      return {
        embeds: [
          new EmbedBuilder()
            .setColor(ErrorJellyfinColor)
            .setAuthor({
              name: 'Unable to disconnect from voice channel',
              iconURL:
                'https://github.com/manuel-rw/jellyfin-discord-music-bot/blob/nestjs-migration/images/icons/alert-circle.png?raw=true',
            })
            .setDescription(
              'I am currently not connected to any voice channels',
            )
            .toJSON(),
        ],
      };
      return;
    }

    connection.destroy();

    return {
      embeds: [
        new EmbedBuilder()
          .setColor(DefaultJellyfinColor)
          .setAuthor({
            name: 'Disconnected from your channel',
            iconURL:
              'https://github.com/manuel-rw/jellyfin-discord-music-bot/blob/nestjs-migration/images/icons/circle-check.png?raw=true',
          })
          .toJSON(),
      ],
    };
  }
}
