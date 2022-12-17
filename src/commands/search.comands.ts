import { TransformPipe } from '@discord-nestjs/common';

import {
  Command,
  DiscordTransformedCommand,
  On,
  Payload,
  TransformedCommandExecutionContext,
  UsePipes,
} from '@discord-nestjs/core';
import { Logger } from '@nestjs/common/services';
import {
  ComponentType,
  EmbedBuilder,
  Events,
  GuildMember,
  Interaction,
  InteractionReplyOptions,
} from 'discord.js';
import { JellyfinSearchService } from '../clients/jellyfin/jellyfin.search.service';
import { TrackRequestDto } from '../models/track-request.dto';
import { DefaultJellyfinColor } from '../types/colors';

import { DiscordMessageService } from '../clients/discord/discord.message.service';

import { createAudioResource } from '@discordjs/voice';
import { formatDuration, intervalToDuration } from 'date-fns';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { JellyfinStreamBuilderService } from '../clients/jellyfin/jellyfin.stream.builder.service';
import { PlaybackService } from '../playback/playback.service';

@Command({
  name: 'search',
  description: 'Search for an item on your Jellyfin instance',
})
@UsePipes(TransformPipe)
export class SearchItemCommand
  implements DiscordTransformedCommand<TrackRequestDto>
{
  private readonly logger: Logger = new Logger(SearchItemCommand.name);

  constructor(
    private readonly jellyfinSearchService: JellyfinSearchService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly playbackService: PlaybackService,
    private readonly jellyfinStreamBuilder: JellyfinStreamBuilderService,
  ) {}

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
              customId: 'searchItemSelect',
              options: selectOptions,
            },
          ],
        },
      ],
    };
  }

  @On(Events.InteractionCreate)
  async onStringSelect(interaction: Interaction) {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId !== 'searchItemSelect') {
      return;
    }

    if (interaction.values.length !== 1) {
      this.logger.warn(
        `Failed to process interaction select with values [${interaction.values.length}]`,
      );
      return;
    }

    const item = await this.jellyfinSearchService.getById(
      interaction.values[0],
    );

    const milliseconds = item.RunTimeTicks / 10000;

    const duration = formatDuration(
      intervalToDuration({
        start: milliseconds,
        end: 0,
      }),
    );

    const artists = item.Artists.join(', ');

    const addedIndex = this.playbackService.eneuqueTrack({
      jellyfinId: item.Id,
      name: item.Name,
      durationInMilliseconds: milliseconds,
    });

    const guildMember = interaction.member as GuildMember;
    const bitrate = guildMember.voice.channel.bitrate;

    this.discordVoiceService.tryJoinChannelAndEstablishVoiceConnection(
      guildMember,
    );

    this.jellyfinStreamBuilder
      .buildStreamUrl(item.Id, bitrate)
      .then((stream) => {
        const resource = createAudioResource(stream);
        this.discordVoiceService.playResource(resource);
      });

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: 'Jellyfin Search',
            iconURL:
              'https://github.com/walkxcode/dashboard-icons/blob/main/png/jellyfin.png?raw=true',
          })
          .setTitle(item.Name)
          .setDescription(
            `**Duration**: ${duration}\n**Artists**: ${artists}\n\nTrack was added to the queue at position ${addedIndex}`,
          )
          .setColor(DefaultJellyfinColor)
          .toJSON(),
      ],
      components: [],
    });
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
