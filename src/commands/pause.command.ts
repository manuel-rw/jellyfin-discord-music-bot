import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { CommandInteraction, InteractionReplyOptions } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';

@Command({
  name: 'pause',
  description: 'Pause or resume the playback of the current track',
})
@UsePipes(TransformPipe)
export class PausePlaybackCommand implements DiscordCommand {
  constructor(
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  handler(
    commandInteraction: CommandInteraction,
  ): string | InteractionReplyOptions {
    const newStatus = this.discordVoiceService.togglePaused();

    if (newStatus) {
      return {
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'Paused',
          }),
        ],
      };
    }

    return {
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Unpaused',
        }),
      ],
    };
  }
}
