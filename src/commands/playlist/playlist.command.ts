import { CollectorInterceptor, SlashCommandPipe } from '@discord-nestjs/common';
import {
  AppliedCollectors,
  Command,
  Handler,
  IA,
  InteractionEvent,
  UseCollectors,
} from '@discord-nestjs/core';

import { Injectable, Logger, UseInterceptors } from '@nestjs/common';

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  InteractionCollector,
  InteractionReplyOptions,
  InteractionUpdateOptions,
} from 'discord.js';

import { PlaybackService } from '../../playback/playback.service';
import { chunkArray } from '../../utils/arrayUtils';
import { Constants } from '../../utils/constants';
import { formatMillisecondsAsHumanReadable } from '../../utils/timeUtils';
import { DiscordMessageService } from '../../clients/discord/discord.message.service';
import { Track } from '../../models/shared/Track';
import { trimStringToFixedLength } from '../../utils/stringUtils/stringUtils';

import { PlaylistInteractionCollector } from './playlist.interaction-collector';
import { PlaylistCommandParams } from './playlist.params';

@Injectable()
@Command({
  name: 'playlist',
  description: 'Print the current track information',
})
@UseInterceptors(CollectorInterceptor)
@UseCollectors(PlaylistInteractionCollector)
export class PlaylistCommand {
  public pageData: Map<string, number> = new Map();
  private readonly logger = new Logger(PlaylistCommand.name);

  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: PlaylistCommandParams,
    @IA() interaction: CommandInteraction,
    @AppliedCollectors(0) collector: InteractionCollector<ButtonInteraction>,
  ): Promise<void> {
    const page = dto.page ?? 0;

    await interaction.reply(
      this.getReplyForPage(page) as InteractionReplyOptions,
    );

    this.pageData.set(interaction.id, page);
    this.logger.debug(
      `Added '${interaction.id}' as a message id for page storage`,
    );

    setTimeout(async () => {
      this.logger.log(
        `Removed the components of message from interaction '${interaction.id}' because the event collector has reachted the timeout`,
      );
      this.pageData.delete(interaction.id);
      await interaction.editReply({
        components: [],
      });
    }, 60 * 1000);
  }

  private getChunks() {
    const playlist = this.playbackService.getPlaylistOrDefault();
    return chunkArray(playlist.tracks, 10);
  }

  public getReplyForPage(
    page: number,
  ): InteractionReplyOptions | InteractionUpdateOptions {
    const chunks = this.getChunks();

    if (chunks.length === 0) {
      return {
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'There are no items in your playlist',
            description:
              'Use the ``/play`` command to add new items to your playlist',
          }),
        ],
        ephemeral: true,
      };
    }

    if (page >= chunks.length) {
      return {
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'Page does not exist',
            description: 'Please pass a valid page',
          }),
        ],
        ephemeral: true,
      };
    }

    const contentForPage = this.getContentForPage(chunks, page);

    if (!contentForPage) {
      return {
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'Your Playlist',
            description:
              'You do not have any tracks in your playlist.\nUse the ``/play`` command to add new tracks to your playlist',
          }),
        ],
        ephemeral: true,
      };
    }

    const hasPrevious = page;
    const hasNext = page + 1 < chunks.length;

    const rowBuilder = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setDisabled(!hasPrevious)
        .setCustomId('playlist-controls-previous')
        .setEmoji('◀️')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setDisabled(!hasNext)
        .setCustomId('playlist-controls-next')
        .setEmoji('▶️')
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary),
    );

    return {
      embeds: [contentForPage.toJSON()],
      ephemeral: true,
      components: [rowBuilder],
      fetchReply: true,
    };
  }

  private getContentForPage(
    chunks: Track[][],
    page: number,
  ): EmbedBuilder | undefined {
    this.logger.verbose(
      `Received request for page ${page} of playlist page chunks`,
    );
    const playlist = this.playbackService.getPlaylistOrDefault();

    if (page >= chunks.length || page < 0) {
      this.logger.warn(`Request for page chunks was out of range: ${page}`);
      return undefined;
    }

    const offset = page * 10;
    const chunk = chunks[page];

    if (!chunk) {
      this.logger.error(
        `Failed to extract chunk from playlist chunks array with page ${page}`,
      );
    }

    const content = chunk
      .map((track, index) => {
        const isCurrent = track === playlist.getActiveTrack();

        // use the offset for the page, add the current index and offset by one because the array index is used
        let point = `${offset + index + 1}. `;
        point += `**${trimStringToFixedLength(track.name, 30)}**`;

        if (isCurrent) {
          point += ' :loud_sound:';
        }

        point += '\n';
        point += Constants.Design.InvisibleSpace.repeat(2);
        point += formatMillisecondsAsHumanReadable(track.getDuration());

        return point;
      })
      .join('\n');

    return new EmbedBuilder().setTitle('Your playlist').setDescription(content);
  }
}
