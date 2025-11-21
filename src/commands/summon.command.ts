import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common';

import { CommandInteraction, GuildMember } from 'discord.js';

import { buildMessage } from '../clients/discord/discord.message.builder';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { defaultMemberPermissions } from '../utils/environment';

@Injectable()
@Command({
  name: 'summon',
  description: 'Join your current voice channel',
  defaultMemberPermissions,
})
export class SummonCommand {
  constructor(private readonly discordVoiceService: DiscordVoiceService) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    await interaction.deferReply();

    const guildMember = interaction.member as GuildMember;

    const tryResult =
      this.discordVoiceService.tryJoinChannelAndEstablishVoiceConnection(
        guildMember,
      );

    if (!tryResult.success) {
      await interaction.editReply(tryResult.reply);
      return;
    }

    await interaction.editReply({
      embeds: [
        buildMessage({
          title: 'Joined your voice channel',
          description:
            "I'm ready to play media. Use ``Cast to device`` in Jellyfin or the ``/play`` command to get started.",
        }),
      ],
    });
  }
}
