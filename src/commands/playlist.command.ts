import { Command, Handler, IA } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common';

import { CommandInteraction } from 'discord.js';

import { PlaybackService } from '../playback/playback.service';
import { Constants } from '../utils/constants';
import { formatMillisecondsAsHumanReadable } from '../utils/timeUtils';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { trimStringToFixedLength } from '../utils/stringUtils/stringUtils';

@Injectable()
@Command({
  name: 'playlist',
  description: 'Print the current track information',
})
export class PlaylistCommand {
  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const playlist = this.playbackService.getPlaylistOrDefault();

    if (!playlist || playlist.tracks.length === 0) {
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'Your Playlist',
            description:
              'You do not have any tracks in your playlist.\nUse the play command to add new tracks to your playlist',
          }),
        ],
      });
      return;
    }

    const tracklist = playlist.tracks
      .slice(0, 10)
      .map((track, index) => {
        const isCurrent = track === playlist.getActiveTrack();

        let point = this.getListPoint(isCurrent, index);
        point += `**${trimStringToFixedLength(track.name, 30)}**`;

        if (isCurrent) {
          point += ' :loud_sound:';
        }

        point += '\n';
        point += Constants.Design.InvisibleSpace.repeat(2);
        point += 'Duration: ';
        point += formatMillisecondsAsHumanReadable(track.getDuration());

        return point;
      })
      .join('\n');
    // const remoteImage = chooseSuitableRemoteImageFromTrack(playlist.getActiveTrack());
    const remoteImage = undefined;

    await interaction.reply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Your Playlist',
          description: `${tracklist}\n\nUse the /skip and /previous command to select a track`,
          mixin(embedBuilder) {
            if (remoteImage === undefined) {
              return embedBuilder;
            }

            return embedBuilder.setThumbnail(remoteImage.Url);
          },
        }),
      ],
    });
  }

  private getListPoint(isCurrent: boolean, index: number) {
    if (isCurrent) {
      return `${index + 1}. `;
    }

    return `${index + 1}. `;
  }
}
