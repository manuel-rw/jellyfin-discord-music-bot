import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { CommandInteraction } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';

@Command({
  name: 'disconnect',
  description: 'Join your current voice channel',
})
@UsePipes(TransformPipe)
export class DisconnectCommand implements DiscordCommand {
  constructor(
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  async handler(interaction: CommandInteraction): Promise<void> {
    await interaction.reply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Disconnecting...',
        }),
      ],
    });

    const disconnect = this.discordVoiceService.disconnect();

    if (!disconnect.success) {
      await interaction.editReply(disconnect.reply);
      return;
    }

    await interaction.editReply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Disconnected from your channel',
        }),
      ],
    });
  }
}
