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
  Events,
  GuildMember,
  Interaction,
  InteractionReplyOptions,
} from 'discord.js';
import { JellyfinSearchService } from '../clients/jellyfin/jellyfin.search.service';
import { TrackRequestDto } from '../models/track-request.dto';

import { DiscordMessageService } from '../clients/discord/discord.message.service';

import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { JellyfinStreamBuilderService } from '../clients/jellyfin/jellyfin.stream.builder.service';
import {
  BaseJellyfinAudioPlayable,
  searchResultAsJellyfinAudio,
} from '../models/jellyfinAudioItems';
import { PlaybackService } from '../playback/playback.service';
import { Constants } from '../utils/constants';

@Command({
  name: 'play',
  description: 'Search for an item on your Jellyfin instance',
})
@UsePipes(TransformPipe)
export class PlayItemCommand
  implements DiscordTransformedCommand<TrackRequestDto>
{
  private readonly logger: Logger = new Logger(PlayItemCommand.name);

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
    const parsedItems = await Promise.all(
      items.map(
        async (item) =>
          await searchResultAsJellyfinAudio(
            this.logger,
            this.jellyfinSearchService,
            item,
          ),
      ),
    );

    if (parsedItems.length === 0) {
      return {
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'No results for your search query found',
            description: `I was not able to find any matches for your query \`\`${dto.search}\`\`. Please check that I have access to the desired libraries and that your query is not misspelled`,
          }),
        ],
      };
    }

    const firstItems = parsedItems.slice(0, 10);

    const lines: string[] = firstItems.map((item, index) => {
      let line = `${index + 1}. `;
      line += item.prettyPrint(dto.search);
      return line;
    });

    let description =
      'I have found **' +
      items.length +
      '** results for your search ``' +
      dto.search +
      '``.';

    if (items.length > 10) {
      description +=
        '\nSince the results exceed 10 items, I truncated them for better readability.';
    }

    description += '\n\n' + lines.join('\n');

    const selectOptions: { label: string; value: string; emoji?: string }[] =
      firstItems.map((item) => ({
        label: item.prettyPrint(dto.search),
        value: item.getValueId(),
        emoji: item.getEmoji(),
      }));

    return {
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'a',
          description: description,
          mixin(embedBuilder) {
            return embedBuilder.setAuthor({
              name: 'Jellyfin Search Results',
              iconURL: Constants.Design.Icons.JellyfinLogo,
            });
          },
        }),
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

    const guildMember = interaction.member as GuildMember;

    const tryResult =
      this.discordVoiceService.tryJoinChannelAndEstablishVoiceConnection(
        guildMember,
      );

    if (!tryResult.success) {
      this.logger.warn(
        `Unable to process select result because the member was not in a voice channcel`,
      );
      const replyOptions = tryResult.reply as InteractionReplyOptions;
      await interaction.update({
        embeds: replyOptions.embeds,
        content: undefined,
        components: [],
      });
      return;
    }

    const bitrate = guildMember.voice.channel.bitrate;

    const valueParts = interaction.values[0].split('_');
    const type = valueParts[0];
    const id = valueParts[1];

    switch (type) {
      case 'track':
        const item = await this.jellyfinSearchService.getById(id);
        const addedIndex = this.enqueueSingleTrack(
          item as BaseJellyfinAudioPlayable,
          bitrate,
        );
        interaction.update({
          embeds: [
            this.discordMessageService.buildMessage({
              title: item.Name,
              description: `Your track was added to the position ${addedIndex} in the playlist`,
            }),
          ],
          components: [],
        });
        break;
      case 'album':
        const album = await this.jellyfinSearchService.getItemsByAlbum(id);
        album.SearchHints.forEach((item) => {
          this.enqueueSingleTrack(item as BaseJellyfinAudioPlayable, bitrate);
        });
        interaction.update({
          embeds: [
            this.discordMessageService.buildMessage({
              title: `Added ${album.TotalRecordCount} items from your album`,
            }),
          ],
          components: [],
        });
        break;
      case 'playlist':
        const playlist = await this.jellyfinSearchService.getPlaylistById(id);
        playlist.Items.forEach((item) => {
          this.enqueueSingleTrack(item as BaseJellyfinAudioPlayable, bitrate);
        });
        interaction.update({
          embeds: [
            this.discordMessageService.buildMessage({
              title: `Added ${playlist.TotalRecordCount} items from your playlist`,
            }),
          ],
          components: [],
        });
        break;
      default:
        interaction.update({
          embeds: [
            this.discordMessageService.buildErrorMessage({
              title: 'Unable to process your selection',
              description: `Sorry. I don't know the type you selected: \`\`${type}\`\`. Please report this bug to the developers.\n\nDebug Information: \`\`${interaction.values.join(
                ', ',
              )}\`\``,
            }),
          ],
          components: [],
        });
        break;
    }
  }

  private enqueueSingleTrack(
    jellyfinPlayable: BaseJellyfinAudioPlayable,
    bitrate: number,
  ) {
    const stream = this.jellyfinStreamBuilder.buildStreamUrl(
      jellyfinPlayable.Id,
      bitrate,
    );

    const milliseconds = jellyfinPlayable.RunTimeTicks / 10000;

    return this.playbackService.eneuqueTrack({
      jellyfinId: jellyfinPlayable.Id,
      name: jellyfinPlayable.Name,
      durationInMilliseconds: milliseconds,
      streamUrl: stream,
    });
  }
}
