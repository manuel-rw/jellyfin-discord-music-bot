import { Command, Handler, IA } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common/decorators';
import { CommandInteraction } from 'discord.js';
import { lightFormat } from 'date-fns';

import {
  buildErrorMessage,
  buildMessage,
} from '../clients/discord/discord.message.builder';
import { PlaybackService } from '../playback/playback.service';

@Injectable()
@Command({
  name: 'nowplaying',
  description: 'Show currently playing track',
  defaultMemberPermissions: 'ViewChannel',
})
export class NowPlayingCommand {
  constructor(private readonly playbackService: PlaybackService) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const playlist = this.playbackService.getPlaylistOrDefault();

    if (!playlist.hasActiveTrack()) {
      await interaction.reply({
        embeds: [
          buildErrorMessage({
            title: 'No track is currently playing',
            description: 'Use the `/play` command to add tracks to the queue.',
          }),
        ],
      });
      return;
    }

    const activeTrack = playlist.getActiveTrack();
    if (!activeTrack) {
      await interaction.reply({
        embeds: [
          buildErrorMessage({
            title: 'No track is currently playing',
            description: 'Your playlist has no active track.',
          }),
        ],
      });
      return;
    }

    const progressMs = activeTrack.getPlaybackProgress() ?? 0;
    const totalMs = activeTrack.getDuration() ?? 0;

    const formattedProgress = lightFormat(new Date(progressMs), 'mm:ss');
    const formattedTotal = lightFormat(new Date(totalMs), 'mm:ss');

    const remoteImages = activeTrack.getRemoteImages();
    const thumbnailUrl = remoteImages?.[0]?.Url;

    await interaction.reply({
      embeds: [
        buildMessage({
          title: 'Now Playing',
          description: `**${activeTrack.name}**`,
          mixin: (embedBuilder) => {
            embedBuilder.addFields([
              {
                name: 'Progress',
                value: `${formattedProgress} / ${formattedTotal}`,
                inline: true,
              },
              {
                name: 'Track ID',
                value: activeTrack.id,
                inline: true,
              },
            ]);

            if (thumbnailUrl) {
              embedBuilder.setThumbnail(thumbnailUrl);
            }

            return embedBuilder;
          },
        }),
      ],
    });
  }
}
