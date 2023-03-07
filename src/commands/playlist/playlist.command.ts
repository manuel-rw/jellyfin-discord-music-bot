import { CollectorInterceptor, SlashCommandPipe } from '@discord-nestjs/common';
import {
  AppliedCollectors,
  Command,
  Handler,
  IA,
  InteractionEvent,
  Param,
  ParamType,
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

class PlaylistCommandDto {
  @Param({
    required: false,
    description: 'The page',
    type: ParamType.INTEGER,
  })
  page: number;
}

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
    @InteractionEvent(SlashCommandPipe) dto: PlaylistCommandDto,
    @IA() interaction: CommandInteraction,
    @AppliedCollectors(0) collector: InteractionCollector<ButtonInteraction>,
  ): Promise<void> {
    const page = dto.page ?? 0;

    const response = await interaction.reply(
      this.getReplyForPage(page) as InteractionReplyOptions,
    );

    this.pageData.set(response.id, page);
    this.logger.debug(
      `Added '${interaction.id}' as a message id for page storage`,
    );
  }

  private getChunks() {
    const playlist = this.playbackService.getPlaylistOrDefault();
    return chunkArray(playlist.tracks, 10);
  }

  public getReplyForPage(
    page: number,
  ): InteractionReplyOptions | InteractionUpdateOptions {
    const chunks = this.getChunks();

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
    };
  }

  private getContentForPage(
    chunks: Track[][],
    page: number,
  ): EmbedBuilder | undefined {
    const playlist = this.playbackService.getPlaylistOrDefault();

    if (page >= chunks.length || page < 0) {
      return undefined;
    }

    const content = chunks[page]
      .map((track, index) => {
        const isCurrent = track === playlist.getActiveTrack();

        let point = this.getListPoint(isCurrent, index);
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

  private getListPoint(isCurrent: boolean, index: number) {
    if (isCurrent) {
      return `${index + 1}. `;
    }

    return `${index + 1}. `;
  }
}
