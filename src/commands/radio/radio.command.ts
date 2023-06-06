import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common';

import { CommandInteraction, GuildMember } from 'discord.js';
import { DiscordMessageService } from 'src/clients/discord/discord.message.service';
import { DiscordVoiceService } from 'src/clients/discord/discord.voice.service';
import { RadioService } from 'src/radio/radio.service';

import { defaultMemberPermissions } from 'src/utils/environment';

@Injectable()
@Command({
  name: 'radio',
  description:
    'Disable normal playback control and indefinitely play tracks from the library.',
  defaultMemberPermissions: defaultMemberPermissions,
})
export class RadioCommand {
  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly radioService: RadioService,
    private readonly discordVoiceService: DiscordVoiceService,
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
      await interaction.editReply(tryResult.reply);
      return;
    }

    const newStatus = await this.radioService.toggle();

    await interaction.editReply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: newStatus ? 'Radio enabled' : 'Radio disabled',
          description: newStatus
            ? 'Normal play controls will be disabled and unavailable. Disable again by running this command again'
            : 'Normal playback controls re-enabled',
        }),
      ],
    });
  }
}
