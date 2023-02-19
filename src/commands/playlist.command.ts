import { Command, DiscordCommand } from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common';

import { CommandInteraction } from 'discord.js';

import { PlaybackService } from '../playback/playback.service';
import { Constants } from '../utils/constants';
import { formatMillisecondsAsHumanReadable } from '../utils/timeUtils';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { chooseSuitableRemoteImageFromTrack } from '../utils/remoteImages/remoteImages';
import { trimStringToFixedLength } from '../utils/stringUtils/stringUtils';

@Command({
  name: 'playlist',
  description: 'Print the current track information',
})
@Injectable()
export class PlaylistCommand implements DiscordCommand {
  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly playbackService: PlaybackService,
  ) {}

  async handler(interaction: CommandInteraction): Promise<void> {
    const playList = this.playbackService.getPlaylist();

    if (playList.tracks.length === 0) {
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'Your Playlist',
            description:
              'You do not have any tracks in your playlist.\nUse the play command to add new tracks to your playlist',
          }),
        ],
      });
    }

    const tracklist = playList.tracks
      .slice(0, 10)
      .map((track, index) => {
        const isCurrent = track.id === playList.activeTrack;

        let point = this.getListPoint(isCurrent, index);
        point += `**${trimStringToFixedLength(track.track.name, 30)}**`;

        if (isCurrent) {
          point += ' :loud_sound:';
        }

        point += '\n';
        point += Constants.Design.InvisibleSpace.repeat(2);
        point += 'Duration: ';
        point += formatMillisecondsAsHumanReadable(
          track.track.durationInMilliseconds,
        );

        return point;
      })
      .join('\n');

    const activeTrack = this.playbackService.getActiveTrack();
    const remoteImage = chooseSuitableRemoteImageFromTrack(activeTrack.track);

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
