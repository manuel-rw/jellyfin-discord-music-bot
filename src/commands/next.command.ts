import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { CommandInteraction } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { PlaybackService } from '../playback/playback.service';

@Command({
  name: 'next',
  description: 'Go to the next track in the playlist',
})
@UsePipes(TransformPipe)
export class SkipTrackCommand implements DiscordCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  async handler(interaction: CommandInteraction): Promise<void> {
    if (!this.playbackService.nextTrack()) {
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'There is no next track',
          }),
        ],
      });
    }

    await interaction.reply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Skipped to the next track',
        }),
      ],
    });
  }
}
