import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable, UseGuards } from '@nestjs/common';

import { CommandInteraction } from 'discord.js';

import { buildMessage } from '../clients/discord/discord.message.builder';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { ChannelLockGuard } from '../clients/discord/guards/channel-lock.guard';
import { DiscordMessageCleanupService } from '../clients/discord/discord.message-cleanup.service';
import { defaultMemberPermissions } from '../utils/environment';

@Injectable()
@UseGuards(ChannelLockGuard)
@Command({
  name: 'pause',
  description: 'Pause or resume the playback of the current track',
  defaultMemberPermissions,
})
export class PausePlaybackCommand {
  constructor(
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly messageCleanupService: DiscordMessageCleanupService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const shouldBePaused = this.discordVoiceService.togglePaused();

    await this.messageCleanupService.scheduleResponseDeletion(
      await interaction.reply({
        withResponse: true,
        embeds: [
          buildMessage({
            title: shouldBePaused ? 'Paused' : 'Unpaused',
          }),
        ],
      }),
    );
  }
}
