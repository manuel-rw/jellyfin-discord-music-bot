import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common/decorators';

import { CommandInteraction } from 'discord.js';

import { PlaybackService } from '../playback/playback.service';
import {
  buildErrorMessage,
  buildMessage,
} from '../clients/discord/discord.message.builder';
import { defaultMemberPermissions } from '../utils/environment';

@Injectable()
@Command({
  name: 'previous',
  description: 'Go to the previous track',
  defaultMemberPermissions,
})
export class PreviousTrackCommand {
  constructor(
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    if (!this.playbackService.getPlaylistOrDefault().hasActiveTrack()) {
      await interaction.reply({
        embeds: [
          buildErrorMessage({
            title: 'There is no previous track',
          }),
        ],
      });
      return;
    }

    this.playbackService.getPlaylistOrDefault().setPreviousTrackAsActiveTrack();
    await interaction.reply({
      embeds: [
        buildMessage({
          title: 'Went to previous track',
        }),
      ],
    });
  }
}
