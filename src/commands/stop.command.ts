import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable, UseGuards } from '@nestjs/common';

import { CommandInteraction } from 'discord.js';

import { PlaybackService } from '../playback/playback.service';
import {
  buildErrorMessage,
  buildMessage,
} from '../clients/discord/discord.message.builder';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { ChannelLockGuard } from '../clients/discord/guards/channel-lock.guard';
import { DiscordMessageCleanupService } from '../clients/discord/discord.message-cleanup.service';
import { defaultMemberPermissions } from '../utils/environment';

@Command({
  name: 'stop',
  description: 'Stop playback entirely and clear the current playlist',
  defaultMemberPermissions,
})
@Injectable()
@UseGuards(ChannelLockGuard)
export class StopPlaybackCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly messageCleanupService: DiscordMessageCleanupService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const playlist = this.playbackService.getPlaylistOrDefault();

    if (playlist.tracks.length === 0) {
      await this.messageCleanupService.scheduleResponseDeletion(
        await interaction.reply({
          withResponse: true,
          embeds: [
            buildErrorMessage({
              title: 'Unable to stop when nothing is playing',
            }),
          ],
        }),
      );
      return;
    }

    if (playlist.hasActiveTrack()) {
      this.discordVoiceService.stop(false);
    }
    playlist.clear();

    await this.messageCleanupService.scheduleResponseDeletion(
      await interaction.reply({
        withResponse: true,
        embeds: [
          buildMessage({
            title: 'Playback stopped',
          }),
        ],
      }),
    );
  }
}
