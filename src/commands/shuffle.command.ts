import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable, UseGuards } from '@nestjs/common';

import { CommandInteraction } from 'discord.js';

import { PlaybackService } from '../playback/playback.service';
import {
  buildErrorMessage,
  buildMessage,
} from '../clients/discord/discord.message.builder';
import { ChannelLockGuard } from '../clients/discord/guards/channel-lock.guard';
import { DiscordMessageCleanupService } from '../clients/discord/discord.message-cleanup.service';
import { defaultMemberPermissions } from '../utils/environment';

@Command({
  name: 'shuffle',
  description: 'Randomize your current playlist',
  defaultMemberPermissions,
})
@Injectable()
@UseGuards(ChannelLockGuard)
export class ShuffleCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly messageCleanupService: DiscordMessageCleanupService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const playlist = this.playbackService.getPlaylistOrDefault();

    if (playlist.tracks.length < 2) {
      await this.messageCleanupService.scheduleResponseDeletion(
        await interaction.reply({
          withResponse: true,
          embeds: [
            buildErrorMessage({
              title: 'Tracks length is less than 2',
            }),
          ],
        }),
      );
      return;
    }

    playlist.shuffle();

    await this.messageCleanupService.scheduleResponseDeletion(
      await interaction.reply({
        withResponse: true,
        embeds: [
          buildMessage({
            title: 'Playlist Shuffled',
          }),
        ],
      }),
    );
  }
}
