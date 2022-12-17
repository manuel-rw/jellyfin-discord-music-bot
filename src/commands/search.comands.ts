import { TransformPipe } from '@discord-nestjs/common';

import {
  Command,
  DiscordTransformedCommand,
  Param,
  Payload,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import {
  APIEmbedField,
  ComponentType,
  EmbedBuilder,
  InteractionReplyOptions,
} from 'discord.js';
import { JellyfinSearchService } from '../clients/jellyfin/jellyfin.search.service';
import { TrackRequestDto } from '../models/track-request.dto';
import { DefaultJellyfinColor } from '../types/colors';

@Command({
  name: 'search',
  description: 'Search for an item on your Jellyfin instance',
})
@UsePipes(TransformPipe)
export class SearchItemCommand
  implements DiscordTransformedCommand<TrackRequestDto>
{
  constructor(private readonly jellyfinSearchService: JellyfinSearchService) {}

  async handler(
    @Payload() dto: TrackRequestDto,
    executionContext: TransformedCommandExecutionContext<any>,
  ): Promise<InteractionReplyOptions | string> {
    const items = await this.jellyfinSearchService.search(dto.search);

    const firstItems = items.slice(0, 10);

    const lines: string[] = firstItems.map(
      (item) =>
        `:white_small_square: ${this.markSearchTermOverlap(
          item.Name,
          dto.search,
        )} *(${item.Type})*`,
    );

    const description = `I have found **${
      items.length
    }** results for your search \`\`${
      dto.search
    }\`\`.\nFor better readability, I have limited the search results to 10\n\n ${lines.join(
      '\n',
    )}`;

    const emojiForType = (type: string) => {
      switch (type) {
        case 'Audio':
          return '🎵';
        case 'Playlist':
          return '📚';
        default:
          return undefined;
      }
    };

    const selectOptions: { label: string; value: string; emoji?: string }[] =
      firstItems.map((item) => ({
        label: item.Name,
        value: item.Id,
        emoji: emojiForType(item.Type),
      }));

    return {
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: 'Jellyfin Search Results',
            iconURL:
              'https://github.com/walkxcode/dashboard-icons/blob/main/png/jellyfin.png?raw=true',
          })
          .setColor(DefaultJellyfinColor)
          .setDescription(description)
          .toJSON(),
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.StringSelect,
              customId: 'cool',
              options: selectOptions,
            },
          ],
        },
      ],
    };
  }

  private markSearchTermOverlap(value: string, searchTerm: string) {
    const startIndex = value.indexOf(searchTerm);
    const actualValue = value.substring(
      startIndex,
      startIndex + 1 + searchTerm.length,
    );
    return `${value.substring(
      0,
      startIndex,
    )}**${actualValue}**${value.substring(
      startIndex + 1 + actualValue.length,
    )}`;
  }
}
