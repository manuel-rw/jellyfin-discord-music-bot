import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { CommandInteraction } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { GenericCustomReply } from '../models/generic-try-handler';

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler(interaction: CommandInteraction): GenericCustomReply {
    const disconnect = this.discordVoiceService.disconnect();

    if (!disconnect.success) {
      return disconnect.reply;
    }

    return {
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Disconnected from your channel',
        }),
      ],
    };
  }
}
