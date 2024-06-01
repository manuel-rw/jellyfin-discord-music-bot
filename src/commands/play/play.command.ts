import { SlashCommandPipe } from '@discord-nestjs/common';
import {
  Command,
  Handler,
  IA,
  InteractionEvent,
  On,
} from '@discord-nestjs/core';

import { RemoteImageInfo } from '@jellyfin/sdk/lib/generated-client/models';

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common/services';

import {
  CommandInteraction,
  Events,
  GuildMember,
  Interaction,
  InteractionReplyOptions,
} from 'discord.js';

import { DiscordMessageService } from '../../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../../clients/discord/discord.voice.service';
import { JellyfinSearchService } from '../../clients/jellyfin/jellyfin.search.service';
import { SearchItem } from '../../models/search/SearchItem';
import { PlaybackService } from '../../playback/playback.service';
import { formatMillisecondsAsHumanReadable } from '../../utils/timeUtils';

import { defaultMemberPermissions } from '../../utils/environment';
import { PlayCommandParams, SearchType } from './play.params';

@Injectable()
@Command({
  name: 'play',
  description: 'Search for an item on your Jellyfin instance',
  defaultMemberPermissions,
})
export class PlayItemCommand {
  private readonly logger: Logger = new Logger(PlayItemCommand.name);

  constructor(
    private readonly jellyfinSearchService: JellyfinSearchService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: PlayCommandParams,
    @IA() interaction: CommandInteraction,
  ) {
    await interaction.deferReply({ ephemeral: true });

    const baseItems = PlayCommandParams.getBaseItemKinds(dto.type);

    let item: SearchItem | undefined;
    if (dto.name.startsWith('native-')) {
      item = await this.jellyfinSearchService.getById(
        dto.name.replace('native-', ''),
        baseItems,
      );
    } else {
      item = (
        await this.jellyfinSearchService.searchItem(dto.name, 1, baseItems)
      ).find((x) => x);
    }

    if (!item) {
      await interaction.followUp({
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'No results found',
            description:
              '- Check for any misspellings\n- Grant me access to your desired libraries\n- Avoid special characters',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    const guildMember = interaction.member as GuildMember;

    const tryResult =
      this.discordVoiceService.tryJoinChannelAndEstablishVoiceConnection(
        guildMember,
      );

    if (!tryResult.success) {
      const replyOptions = tryResult.reply as InteractionReplyOptions;
      await interaction.editReply({
        embeds: replyOptions.embeds,
      });
      return;
    }

    const tracks = await item.toTracks(this.jellyfinSearchService);
    this.logger.debug(`Extracted ${tracks.length} tracks from the search item`);
    const reducedDuration = tracks.reduce(
      (sum, item) => sum + item.duration,
      0,
    );
    this.logger.debug(
      `Adding ${tracks.length} tracks with a duration of ${reducedDuration} ticks`,
    );
    this.playbackService.getPlaylistOrDefault().enqueueTracks(tracks);

    const remoteImages = tracks.flatMap((track) => track.getRemoteImages());
    const remoteImage: RemoteImageInfo | undefined =
      remoteImages.length > 0 ? remoteImages[0] : undefined;

    await interaction.followUp({
      embeds: [
        this.discordMessageService.buildMessage({
          title: `Added ${
            tracks.length
          } tracks to your playlist (${formatMillisecondsAsHumanReadable(
            reducedDuration,
          )})`,
          mixin(embedBuilder) {
            if (!remoteImage?.Url) {
              return embedBuilder;
            }
            return embedBuilder.setThumbnail(remoteImage.Url);
          },
        }),
      ],
      ephemeral: true,
    });
  }

  @On(Events.InteractionCreate)
  async onAutocomplete(interaction: Interaction) {
    if (!interaction.isAutocomplete()) {
      return;
    }

    const focusedAutoCompleteAction = interaction.options.getFocused(true);
    const typeIndex = interaction.options.getInteger('type');
    const type =
      typeIndex !== null ? Object.values(SearchType)[typeIndex] : undefined;
    const searchQuery = focusedAutoCompleteAction.value;

    if (!searchQuery || searchQuery.length < 1) {
      await interaction.respond([]);
      this.logger.debug(
        'Did not attempt a search, because the auto-complete option was empty',
      );
      return;
    }

    this.logger.debug(
      `Initiating auto-complete search for query '${searchQuery}' with type '${type}'`,
    );

    const hints = await this.jellyfinSearchService.searchItem(
      searchQuery,
      20,
      PlayCommandParams.getBaseItemKinds(type as SearchType),
    );

    if (hints.length === 0) {
      await interaction.respond([]);
      return;
    }

    await interaction.respond(
      hints.map((hint) => ({
        name: hint.toString(),
        value: `native-${hint.getId()}`,
      })),
    );
  }
}
