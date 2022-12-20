import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { CommandInteraction, InteractionReplyOptions } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { PlaybackService } from '../playback/playback.service';

@Command({
  name: 'next',
  description: 'Go to the next track in the playlist',
})
@UsePipes(TransformPipe)
export class SkipTrackCommand implements DiscordCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  handler(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interactionCommand: CommandInteraction,
  ): InteractionReplyOptions | string {
    if (!this.playbackService.nextTrack()) {
      return {
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'There is no next track',
          }),
        ],
      };
    }

    return {
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Skipped to the next track',
        }),
      ],
    };
  }
}
