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
  name: 'shuffle',
  description: 'Randomize your current playlist',
  defaultMemberPermissions,
})
@Injectable()
export class ShuffleCommand {
  constructor(private readonly playbackService: PlaybackService) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const playlist = this.playbackService.getPlaylistOrDefault();

    if (playlist.tracks.length < 2) {
      await interaction.reply({
        embeds: [
          buildErrorMessage({
            title: 'Tracks length is less than 2',
          }),
        ],
      });
      return;
    }

    playlist.shuffle();

    await interaction.reply({
      embeds: [
        buildMessage({
          title: 'Playlist Shuffled',
        }),
      ],
    });
  }
}
