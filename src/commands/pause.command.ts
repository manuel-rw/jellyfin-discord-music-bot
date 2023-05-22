import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common';

import { CommandInteraction } from 'discord.js';

import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { defaultMemberPermissions } from 'src/utils/environment';

@Injectable()
@Command({
  name: 'pause',
  description: 'Pause or resume the playback of the current track',
  defaultMemberPermissions: defaultMemberPermissions,
})
export class PausePlaybackCommand {
  constructor(
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const shouldBePaused = this.discordVoiceService.togglePaused();

    await interaction.reply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: shouldBePaused ? 'Paused' : 'Unpaused',
        }),
      ],
    });
  }
}
