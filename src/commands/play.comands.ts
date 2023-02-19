import { SlashCommandPipe } from '@discord-nestjs/common';
import {
  Command,
  Handler,
  IA,
  InteractionEvent,
  On,
} from '@discord-nestjs/core';

import { RemoteImageResult } from '@jellyfin/sdk/lib/generated-client/models';

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common/services';

import {
  CommandInteraction,
  ComponentType,
  Events,
  GuildMember,
  Interaction,
  InteractionReplyOptions,
} from 'discord.js';

import {
  BaseJellyfinAudioPlayable,
  searchResultAsJellyfinAudio,
} from '../models/jellyfinAudioItems';
import { TrackRequestDto } from '../models/track-request.dto';
import { PlaybackService } from '../playback/playback.service';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { JellyfinSearchService } from '../clients/jellyfin/jellyfin.search.service';
import { JellyfinStreamBuilderService } from '../clients/jellyfin/jellyfin.stream.builder.service';
import { GenericTrack } from '../models/shared/GenericTrack';
import { chooseSuitableRemoteImage } from '../utils/remoteImages/remoteImages';
import { trimStringToFixedLength } from '../utils/stringUtils/stringUtils';

@Injectable()
@Command({
  name: 'play',
  description: 'Search for an item on your Jellyfin instance',
})
export class PlayItemCommand {
  private readonly logger: Logger = new Logger(PlayItemCommand.name);

  constructor(
    private readonly jellyfinSearchService: JellyfinSearchService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly playbackService: PlaybackService,
    private readonly jellyfinStreamBuilder: JellyfinStreamBuilderService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: TrackRequestDto,
    @IA() interaction: CommandInteraction,
  ): Promise<InteractionReplyOptions | string> {
    await interaction.deferReply();

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
      await interaction.followUp({
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'No results for your search query found',
            description: `I was not able to find any matches for your query \`\`${dto.search}\`\`. Please check that I have access to the desired libraries and that your query is not misspelled`,
          }),
        ],
      });
      return;
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
        label: item.prettyPrint(dto.search).replace(/\*/g, ''),
        value: item.getValueId(),
        emoji: item.getEmoji(),
      }));

    await interaction.followUp({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Jellyfin Search Results',
          description: description,
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
    });
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

    await interaction.deferUpdate();

    await interaction.editReply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Applying your selection to the queue...',
          description: `This may take a moment. Please wait`,
        }),
      ],
      components: [],
    });

    const guildMember = interaction.member as GuildMember;

    this.logger.debug(
      `Trying to join the voice channel of ${guildMember.displayName}`,
    );

    const tryResult =
      this.discordVoiceService.tryJoinChannelAndEstablishVoiceConnection(
        guildMember,
      );

    if (!tryResult.success) {
      this.logger.warn(
        `Unable to process select result because the member was not in a voice channcel`,
      );
      const replyOptions = tryResult.reply as InteractionReplyOptions;
      await interaction.editReply({
        embeds: replyOptions.embeds,
        content: undefined,
        components: [],
      });
      return;
    }

    this.logger.debug('Successfully joined the voice channel');

    const valueParts = interaction.values[0].split('_');

    if (valueParts.length !== 2) {
      this.logger.error(
        `Failed to extract interaction values from [${valueParts.join(',')}]`,
      );
      return;
    }

    const type = valueParts[0];
    const id = valueParts[1];

    this.logger.debug(
      `Searching for the content using the values [${interaction.values.join(
        ', ',
      )}]`,
    );

    switch (type) {
      case 'track':
        const item = await this.jellyfinSearchService.getById(id);
        const remoteImagesOfCurrentAlbum =
          await this.jellyfinSearchService.getRemoteImageById(item.AlbumId);
        const trackRemoteImage = chooseSuitableRemoteImage(
          remoteImagesOfCurrentAlbum,
        );
        const addedIndex = this.enqueueSingleTrack(
          item as BaseJellyfinAudioPlayable,
          remoteImagesOfCurrentAlbum,
        );
        await interaction.editReply({
          embeds: [
            this.discordMessageService.buildMessage({
              title: item.Name,
              description: `Your track was added to the position ${addedIndex} in the playlist`,
              mixin(embedBuilder) {
                if (trackRemoteImage === undefined) {
                  return embedBuilder;
                }

                return embedBuilder.setThumbnail(trackRemoteImage.Url);
              },
            }),
          ],
          components: [],
        });
        break;
      case 'album':
        const album = await this.jellyfinSearchService.getItemsByAlbum(id);
        const remoteImages =
          await this.jellyfinSearchService.getRemoteImageById(id);
        const albumRemoteImage = chooseSuitableRemoteImage(remoteImages);
        album.SearchHints.forEach((item) => {
          this.enqueueSingleTrack(
            item as BaseJellyfinAudioPlayable,
            remoteImages,
          );
        });
        await interaction.editReply({
          embeds: [
            this.discordMessageService.buildMessage({
              title: `Added ${album.TotalRecordCount} items from your album`,
              description: `${album.SearchHints.map((item) =>
                trimStringToFixedLength(item.Name, 20),
              ).join(', ')}`,
              mixin(embedBuilder) {
                if (albumRemoteImage === undefined) {
                  return embedBuilder;
                }

                return embedBuilder.setThumbnail(albumRemoteImage.Url);
              },
            }),
          ],
          components: [],
        });
        break;
      case 'playlist':
        const playlist = await this.jellyfinSearchService.getPlaylistById(id);
        const addedRemoteImages: RemoteImageResult = {};
        for (let index = 0; index < playlist.Items.length; index++) {
          const item = playlist.Items[index];
          const remoteImages =
            await this.jellyfinSearchService.getRemoteImageById(id);
          addedRemoteImages.Images.concat(remoteImages.Images);
          this.enqueueSingleTrack(
            item as BaseJellyfinAudioPlayable,
            remoteImages,
          );
        }
        const bestPlaylistRemoteImage =
          chooseSuitableRemoteImage(addedRemoteImages);
        await interaction.editReply({
          embeds: [
            this.discordMessageService.buildMessage({
              title: `Added ${playlist.TotalRecordCount} items from your playlist`,
              description: `${playlist.Items.map((item) =>
                trimStringToFixedLength(item.Name, 20),
              ).join(', ')}`,
              mixin(embedBuilder) {
                if (bestPlaylistRemoteImage === undefined) {
                  return embedBuilder;
                }

                return embedBuilder.setThumbnail(bestPlaylistRemoteImage.Url);
              },
            }),
          ],
          components: [],
        });
        break;
      default:
        await interaction.editReply({
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
    remoteImageResult: RemoteImageResult,
  ) {
    return this.playbackService
      .getPlaylistOrDefault()
      .enqueueTracks([
        GenericTrack.constructFromJellyfinPlayable(
          jellyfinPlayable,
          remoteImageResult,
        ),
      ]);
  }
}
