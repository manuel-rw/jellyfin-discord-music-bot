import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common';

import { CommandInteraction } from 'discord.js';

import { PlaybackService } from '../playback/playback.service';
import {
  buildErrorMessage,
  buildMessage,
} from '../clients/discord/discord.message.builder';
import { defaultMemberPermissions } from '../utils/environment';

@Command({
  name: 'next',
  description: 'Go to the next track in the playlist',
  defaultMemberPermissions,
})
@Injectable()
export class SkipTrackCommand {
  constructor(
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    if (!this.playbackService.getPlaylistOrDefault().hasActiveTrack()) {
      await interaction.reply({
        embeds: [
          buildErrorMessage({
            title: 'There is no next track',
          }),
        ],
      });
      return;
    }

    this.playbackService.getPlaylistOrDefault().setNextTrackAsActiveTrack();
    await interaction.reply({
      embeds: [
        buildMessage({
          title: 'Skipped to the next track',
        }),
      ],
    });
  }
}
