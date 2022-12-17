import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { CommandInteraction } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { GenericCustomReply } from '../models/generic-try-handler';

@Command({
  name: 'current',
  description: 'Print the current track information',
})
@UsePipes(TransformPipe)
export class CurrentTrackCommand implements DiscordCommand {
  constructor(private readonly discordMessageService: DiscordMessageService) {}

  handler(interaction: CommandInteraction): GenericCustomReply {
    return {
      embeds: [
        this.discordMessageService.buildErrorMessage({
          title: 'NOT IMPLEMENTED',
        }),
      ],
    };
  }
}
