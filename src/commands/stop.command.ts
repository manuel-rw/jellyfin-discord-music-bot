import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common';

import { CommandInteraction } from 'discord.js';

import { PlaybackService } from '../playback/playback.service';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { defaultMemberPermissions } from 'src/utils/environment';

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
    const hasActiveTrack = this.playbackService.getPlaylistOrDefault();
    const title = hasActiveTrack
      ? 'Playback stopped successfully'
      : 'Playback failed to stop';
    const description = hasActiveTrack
      ? 'In addition, your playlist has been cleared'
      : 'There is no active track in the queue';
    if (hasActiveTrack) {
      this.discordVoiceService.stop(false);
      // this.playbackService.getPlaylistOrDefault().clear();
    }

    await interaction.reply({
      embeds: [
        this.discordMessageService[
          hasActiveTrack ? 'buildMessage' : 'buildErrorMessage'
        ]({
          title,
          description,
        }),
      ],
    });
  }
}
