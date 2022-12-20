import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { CommandInteraction, InteractionReplyOptions } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { PlaybackService } from '../playback/playback.service';

@Command({
  name: 'previous',
  description: 'Go to the previous track',
})
@UsePipes(TransformPipe)
export class PreviousTrackCommand implements DiscordCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  handler(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dcommandInteraction: CommandInteraction,
  ): InteractionReplyOptions | string {
    if (!this.playbackService.previousTrack()) {
      return {
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'There is no previous track',
          }),
        ],
      };
    }

    return {
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Went to previous track',
        }),
      ],
    };
  }
}
