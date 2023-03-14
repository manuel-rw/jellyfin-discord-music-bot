import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common/decorators';

import { CommandInteraction } from 'discord.js';

import { PlaybackService } from '../playback/playback.service';
import { DiscordMessageService } from '../clients/discord/discord.message.service';

@Injectable()
@Command({
  name: 'previous',
  description: 'Go to the previous track',
})
export class PreviousTrackCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    if (!this.playbackService.getPlaylistOrDefault().hasActiveTrack()) {
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'There is no previous track',
          }),
        ],
      });
      return;
    }

    this.playbackService.getPlaylistOrDefault().setPreviousTrackAsActiveTrack();
    await interaction.reply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Went to previous track',
        }),
      ],
    });
  }
}
