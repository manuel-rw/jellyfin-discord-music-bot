import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { CommandInteraction } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { GenericCustomReply } from '../models/generic-try-handler';
import { PlaybackService } from '../playback/playback.service';
import { Constants } from '../utils/constants';
import { trimStringToFixedLength } from '../utils/stringUtils';
import { formatMillisecondsAsHumanReadable } from '../utils/timeUtils';

@Command({
  name: 'playlist',
  description: 'Print the current track information',
})
@UsePipes(TransformPipe)
export class PlaylistCommand implements DiscordCommand {
  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly playbackService: PlaybackService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler(interaction: CommandInteraction): GenericCustomReply {
    const playList = this.playbackService.getPlaylist();

    if (playList.tracks.length === 0) {
      return {
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'Your Playlist',
            description:
              'You do not have any tracks in your playlist.\nUse the play command to add new tracks to your playlist',
          }),
        ],
      };
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

    return {
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Your Playlist',
          description: `${tracklist}\n\nUse the /skip and /previous command to select a track`,
        }),
      ],
    };
  }

  private getListPoint(isCurrent: boolean, index: number) {
    if (isCurrent) {
      return `${index + 1}. `;
    }

    return `${index + 1}. `;
  }
}
