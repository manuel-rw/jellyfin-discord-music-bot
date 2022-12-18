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
          .setAuthor({
            name: title,
            iconURL: Constants.Design.Icons.ErrorIcon,
          })
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
    authorUrl,
    mixin = (builder) => builder,
  }: {
    title: string;
    description?: string;
    authorUrl?: string;
    mixin?: (embedBuilder: EmbedBuilder) => EmbedBuilder;
  }): APIEmbed {
    const date = formatRFC7231(new Date());

    let embedBuilder = new EmbedBuilder()
      .setColor(DefaultJellyfinColor)
      .setAuthor({
        name: title,
        iconURL: Constants.Design.Icons.JellyfinLogo,
        url: authorUrl,
      })
      .setFooter({
        text: `${date}`,
      });

    if (description !== undefined && description.length >= 1) {
      embedBuilder = embedBuilder.setDescription(description);
    }

    embedBuilder = mixin(embedBuilder);

    return embedBuilder.toJSON();
  }
}
