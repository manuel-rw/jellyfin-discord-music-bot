import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common/decorators';

import { CommandInteraction } from 'discord.js';

import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { defaultMemberPermissions } from '../utils/environment';
import { PlaybackService } from 'src/playback/playback.service';

@Injectable()
@Command({
  name: 'disconnect',
  description: 'Join your current voice channel',
  defaultMemberPermissions,
})
export class DisconnectCommand {
  constructor(
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    await interaction.reply({
      embeds: [
        DiscordMessageService.buildMessage({
          title: 'Disconnecting...',
        }),
      ],
    });

    const playlist = this.playbackService.getPlaylistOrDefault();

    if (playlist.hasActiveTrack()) {
      this.discordVoiceService.stop(false);
    }
    playlist.clear();

    const disconnect = this.discordVoiceService.disconnect();

    if (!disconnect.success) {
      await interaction.editReply(disconnect.reply);
      return;
    }

    await interaction.editReply({
      embeds: [
        DiscordMessageService.buildMessage({
          title: 'Disconnected from your channel',
        }),
      ],
    });
  }
}
