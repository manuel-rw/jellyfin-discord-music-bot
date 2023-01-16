import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { CommandInteraction } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { GenericCustomReply } from '../models/generic-try-handler';
import { PlaybackService } from '../playback/playback.service';

@Command({
  name: 'stop',
  description: 'Stop playback entirely and clear the current playlist',
})
@UsePipes(TransformPipe)
export class StopPlaybackCommand implements DiscordCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordVoiceService: DiscordVoiceService,
  ) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler(CommandInteraction: CommandInteraction): GenericCustomReply {
    const hasActiveTrack = this.playbackService.hasActiveTrack()
    const title = hasActiveTrack ? 'Playback stopped successfully' : 'Playback failed to stop'
    const description = hasActiveTrack ? 'In addition, your playlist has been cleared' : 'There is no active track in the queue'
    if (hasActiveTrack) {
      this.playbackService.clear();
      this.discordVoiceService.stop(false);
    }

    return {
      embeds: [
        this.discordMessageService[hasActiveTrack ? 'buildMessage' : 'buildErrorMessage']({
          title: title,
          description: description,
        }),
      ],
    };
  }
}
