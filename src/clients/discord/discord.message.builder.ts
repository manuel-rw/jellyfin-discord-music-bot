import { APIEmbed, EmbedBuilder } from 'discord.js';

import { DefaultJellyfinColor, ErrorJellyfinColor } from '../../types/colors';
import { Constants } from '../../utils/constants';

export const buildMessage = ({
  title,
  description,
  authorUrl,
  mixin = (builder) => builder,
}: {
  title: string;
  description?: string;
  authorUrl?: string;
  mixin?: (embedBuilder: EmbedBuilder) => EmbedBuilder;
}): APIEmbed => {
  let embedBuilder = new EmbedBuilder()
    .setColor(DefaultJellyfinColor)
    .setAuthor({
      name: title,
      iconURL: Constants.Design.Icons.JellyfinLogo,
      url: authorUrl,
    });

  if (description !== undefined && description.length >= 1) {
    embedBuilder = embedBuilder.setDescription(description);
  }

  embedBuilder = mixin(embedBuilder);

  return embedBuilder.toJSON();
};

export const buildErrorMessage = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}): APIEmbed => {
  return buildMessage({
    title,
    description,
    mixin(embedBuilder) {
      return embedBuilder
        .setAuthor({
          name: title,
          iconURL: Constants.Design.Icons.ErrorIcon,
        })
        .setFooter({
          text: `Report this issue: ${Constants.Links.ReportIssue}`,
        })
        .setColor(ErrorJellyfinColor);
    },
  });
};
