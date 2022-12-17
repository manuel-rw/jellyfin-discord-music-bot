import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { CommandInteraction } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { GenericCustomReply } from '../models/generic-try-handler';
import { PlaybackService } from '../playback/playback.service';
import { Constants } from '../utils/constants';
import { formatMillisecondsAsHumanReadable } from '../utils/timeUtils';

@Command({
  name: 'current',
  description: 'Print the current track information',
})
@UsePipes(TransformPipe)
export class CurrentTrackCommand implements DiscordCommand {
  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly playbackService: PlaybackService,
  ) {}

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
      .map((track) => {
        const isCurrent = track.id === playList.activeTrack;
        return `${this.getListPoint(isCurrent)} ${
          track.track.name
        }\n${Constants.Design.InvisibleSpace.repeat(
          3,
        )}${formatMillisecondsAsHumanReadable(
          track.track.durationInMilliseconds,
        )} ${isCurrent && ' *(active track)*'}`;
      })
      .join(',\n');

    return {
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Your Playlist',
          description: tracklist,
        }),
      ],
    };
  }

  private getListPoint(isCurrent: boolean) {
    if (isCurrent) {
      return ':black_small_square:';
    }

    return ':white_small_square:';
  }
}
