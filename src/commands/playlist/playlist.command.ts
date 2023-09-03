import { CollectorInterceptor, SlashCommandPipe } from '@discord-nestjs/common';
import {
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
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  InteractionReplyOptions,
  InteractionUpdateOptions,
} from 'discord.js';

import { DiscordMessageService } from '../../clients/discord/discord.message.service';
import { Track } from '../../models/shared/Track';
import { PlaybackService } from '../../playback/playback.service';
import { chunkArray } from '../../utils/arrayUtils';
import {
  trimStringToFixedLength,
  zeroPad,
} from '../../utils/stringUtils/stringUtils';

import { Interval } from '@nestjs/schedule';
import { lightFormat } from 'date-fns';
import { defaultMemberPermissions } from 'src/utils/environment';
import { PlaylistInteractionCollector } from './playlist.interaction-collector';
import { PlaylistCommandParams } from './playlist.params';
import { PlaylistTempCommandData } from './playlist.types';

@Injectable()
@Command({
  name: 'playlist',
  description: 'Print the current track information',
  defaultMemberPermissions,
})
@UseInterceptors(CollectorInterceptor)
@UseCollectors(PlaylistInteractionCollector)
export class PlaylistCommand {
  public pageData: Map<string, PlaylistTempCommandData> = new Map();
  private readonly logger = new Logger(PlaylistCommand.name);

  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: PlaylistCommandParams,
    @IA() interaction: CommandInteraction,
  ): Promise<void> {
    const page = dto.page ?? 0;

    await interaction.reply(
      this.getReplyForPage(page) as InteractionReplyOptions,
    );

    this.pageData.set(interaction.id, {
      page,
      interaction,
    });
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

  private createInterval(interaction: CommandInteraction) {
    return setInterval(async () => {
      const tempData = this.pageData.get(interaction.id);

      if (!tempData) {
        this.logger.warn(
          `Failed to update from interval, because temp data was not found`,
        );
        return;
      }

      await interaction.editReply(this.getReplyForPage(tempData.page));
    }, 2000);
  }

  @Interval(2 * 1000)
  private async updatePlaylists() {
    if (this.pageData.size === 0) {
      return;
    }

    this.logger.verbose(
      `Updating playlist for ${this.pageData.size} playlist datas`,
    );

    this.pageData.forEach(async (value) => {
      await value.interaction.editReply(this.getReplyForPage(value.page));
    });
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

    const paddingNumber = playlist.getLength() >= 100 ? 3 : 2;

    const content = chunk
      .map((track, index) => {
        const isCurrent = track === playlist.getActiveTrack();

        let line = `\`\`${zeroPad(offset + index + 1, paddingNumber)}.\`\` `;
        line += this.getTrackName(track, isCurrent) + ' • ';
        if (isCurrent) {
          line += lightFormat(track.getPlaybackProgress(), 'mm:ss') + ' / ';
        }
        line += lightFormat(track.getDuration(), 'mm:ss');
        if (isCurrent) {
          line += ' • (:play_pause:)';
        }
        return line;
      })
      .join('\n');

    return new EmbedBuilder().setTitle('Your playlist').setDescription(content);
  }

  private getTrackName(track: Track, active: boolean) {
    const trimmedTitle = trimStringToFixedLength(track.name, 30);
    if (active) {
      return `**${trimmedTitle}**`;
    }

    return trimmedTitle;
  }
}
