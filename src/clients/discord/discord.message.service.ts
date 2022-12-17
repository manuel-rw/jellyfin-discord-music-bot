import { Injectable } from '@nestjs/common';
import { APIEmbed, EmbedBuilder } from 'discord.js';
import { DefaultJellyfinColor, ErrorJellyfinColor } from '../../types/colors';

import { formatRFC7231 } from 'date-fns';
import { Constants } from '../../utils/constants';

@Injectable()
export class DiscordMessageService {
  buildErrorMessage({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }): APIEmbed {
    const date = formatRFC7231(new Date());
    return this.buildMessage({
      title: title,
      description: description,
      mixin(embedBuilder) {
        return embedBuilder
          .setFooter({
            text: `${date} - Report an issue: ${Constants.Links.ReportIssue}`,
          })
          .setColor(ErrorJellyfinColor);
      },
    });
  }

  buildMessage({
    title,
    description,
    mixin = (builder) => builder,
  }: {
    title: string;
    description?: string;
    mixin?: (embedBuilder: EmbedBuilder) => EmbedBuilder;
  }): APIEmbed {
    const date = formatRFC7231(new Date());

    let embedBuilder = new EmbedBuilder()
      .setColor(DefaultJellyfinColor)
      .setAuthor({
        name: title,
        iconURL:
          'https://github.com/manuel-rw/jellyfin-discord-music-bot/blob/nestjs-migration/images/icons/circle-check.png?raw=true',
      })
      .setFooter({
        text: `${date}`,
      });

    if (description !== undefined && description.length > 0) {
      embedBuilder = embedBuilder.setDescription(description);
    }

    embedBuilder = mixin(embedBuilder);

    return embedBuilder.toJSON();
  }
}
