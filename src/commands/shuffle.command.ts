import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common';

import { CommandInteraction } from 'discord.js';

import { PlaybackService } from '../playback/playback.service';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { defaultMemberPermissions } from '../utils/environment';

@Command({
  name: 'shuffle',
  description: 'Randomize your current playlist',
  defaultMemberPermissions,
})
@Injectable()
export class ShuffleCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordVoiceService: DiscordVoiceService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const playlist = this.playbackService.getPlaylistOrDefault();

    if (playlist.tracks.length < 2) {
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'Tracks length is less than 2',
          }),
        ],
      });
      return;
    }

    playlist.shuffle();

    await interaction.reply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Playlist Shuffled',
        }),
      ],
    });
  }
}
