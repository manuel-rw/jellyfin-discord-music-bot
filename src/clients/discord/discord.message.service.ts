import { Injectable } from '@nestjs/common';
import { APIEmbed, EmbedBuilder } from 'discord.js';
import { DefaultJellyfinColor, ErrorJellyfinColor } from '../../types/colors';

@Injectable()
export class DiscordMessageService {
  buildErrorMessage({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }): APIEmbed {
    const embedBuilder = new EmbedBuilder()
      .setColor(ErrorJellyfinColor)
      .setAuthor({
        name: title,
        iconURL:
          'https://github.com/manuel-rw/jellyfin-discord-music-bot/blob/nestjs-migration/images/icons/alert-circle.png?raw=true',
      });

    if (description !== undefined) {
      embedBuilder.setDescription(description);
    }

    return embedBuilder.toJSON();
  }

  buildMessage({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }): APIEmbed {
    const embedBuilder = new EmbedBuilder()
      .setColor(DefaultJellyfinColor)
      .setAuthor({
        name: title,
        iconURL:
          'https://github.com/manuel-rw/jellyfin-discord-music-bot/blob/nestjs-migration/images/icons/circle-check.png?raw=true',
      });

    if (description !== undefined) {
      embedBuilder.setDescription(description);
    }

    return embedBuilder.toJSON();
  }
}
