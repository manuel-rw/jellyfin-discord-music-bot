import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common';

import { CommandInteraction } from 'discord.js';

import { PlaybackService } from '../playback/playback.service';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { defaultMemberPermissions } from '../utils/environment';

@Command({
  name: 'stop',
  description: 'Stop playback entirely and clear the current playlist',
  defaultMemberPermissions,
})
@Injectable()
export class StopPlaybackCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordVoiceService: DiscordVoiceService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const playlist = this.playbackService.getPlaylistOrDefault();

    if (playlist.tracks.length === 0) {
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'Unable to stop when nothing is playing'
          }),
        ],
      });
      return;
    }

    if (playlist.hasActiveTrack()) {
      this.discordVoiceService.stop(false);
    }
    playlist.clear();

    await interaction.reply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Playback stopped'
        }),
      ],
    });
  }
}
