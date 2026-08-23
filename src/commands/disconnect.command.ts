import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable, UseGuards } from '@nestjs/common/decorators';

import { CommandInteraction } from 'discord.js';

import { buildMessage } from '../clients/discord/discord.message.builder';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { ChannelLockGuard } from '../clients/discord/guards/channel-lock.guard';
import { DiscordMessageCleanupService } from '../clients/discord/discord.message-cleanup.service';
import { defaultMemberPermissions } from '../utils/environment';
import { PlaybackService } from '../playback/playback.service';

@Injectable()
@UseGuards(ChannelLockGuard)
@Command({
  name: 'disconnect',
  description: 'Join your current voice channel',
  defaultMemberPermissions,
})
export class DisconnectCommand {
  constructor(
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly playbackService: PlaybackService,
    private readonly messageCleanupService: DiscordMessageCleanupService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    await this.messageCleanupService.scheduleResponseDeletion(
      await interaction.reply({
        withResponse: true,
        embeds: [
          buildMessage({
            title: 'Disconnecting...',
          }),
        ],
      }),
    );

    const playlist = this.playbackService.getPlaylistOrDefault();

    if (playlist.hasActiveTrack()) {
      this.discordVoiceService.stop(false);
    }
    playlist.clear();

    const disconnect = this.discordVoiceService.disconnect();

    if (!disconnect.success) {
      await interaction.editReply(disconnect.reply);
      return;
    }

    await interaction.editReply({
      embeds: [
        buildMessage({
          title: 'Disconnected from your channel',
        }),
      ],
    });
  }
}
