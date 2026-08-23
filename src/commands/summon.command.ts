import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable, UseGuards } from '@nestjs/common';

import { CommandInteraction, GuildMember } from 'discord.js';

import { buildMessage } from '../clients/discord/discord.message.builder';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { ChannelLockGuard } from '../clients/discord/guards/channel-lock.guard';
import { DiscordMessageCleanupService } from '../clients/discord/discord.message-cleanup.service';
import { defaultMemberPermissions } from '../utils/environment';

@Injectable()
@UseGuards(ChannelLockGuard)
@Command({
  name: 'summon',
  description: 'Join your current voice channel',
  defaultMemberPermissions,
})
export class SummonCommand {
  constructor(
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly messageCleanupService: DiscordMessageCleanupService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    await interaction.deferReply();

    const guildMember = interaction.member as GuildMember;

    const tryResult =
      this.discordVoiceService.tryJoinChannelAndEstablishVoiceConnection(
        guildMember,
      );

    if (!tryResult.success) {
      await this.messageCleanupService.scheduleResponseDeletion(
        await interaction.editReply(tryResult.reply),
      );
      return;
    }

    await this.messageCleanupService.scheduleResponseDeletion(
      await interaction.editReply({
        embeds: [
          buildMessage({
            title: 'Joined your voice channel',
            description:
              "I'm ready to play media. Use ``Cast to device`` in Jellyfin or the ``/play`` command to get started.",
          }),
        ],
      }),
    );
  }
}
