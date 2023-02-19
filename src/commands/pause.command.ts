import { Command, DiscordCommand } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common';

import { CommandInteraction } from 'discord.js';

import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';

@Command({
  name: 'pause',
  description: 'Pause or resume the playback of the current track',
})
@Injectable()
export class PausePlaybackCommand implements DiscordCommand {
  constructor(
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  async handler(interaction: CommandInteraction): Promise<void> {
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
