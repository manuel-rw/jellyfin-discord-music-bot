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
  name: 'next',
  description: 'Go to the next track in the playlist',
  defaultMemberPermissions,
})
@Injectable()
@UseGuards(ChannelLockGuard)
export class SkipTrackCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly messageCleanupService: DiscordMessageCleanupService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    if (!this.playbackService.getPlaylistOrDefault().hasActiveTrack()) {
      await this.messageCleanupService.scheduleResponseDeletion(
        await interaction.reply({
          withResponse: true,
          embeds: [
            buildErrorMessage({
              title: 'There is no next track',
            }),
          ],
        }),
      );
      return;
    }

    this.playbackService.getPlaylistOrDefault().setNextTrackAsActiveTrack();
    await this.messageCleanupService.scheduleResponseDeletion(
      await interaction.reply({
        withResponse: true,
        embeds: [
          buildMessage({
            title: 'Skipped to the next track',
          }),
        ],
      }),
    );
  }
}
