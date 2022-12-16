import { Module } from '@nestjs/common';
import { DiscordModule } from '@discord-nestjs/core';

import { HelpCommand } from './help.command';
import { StatusCommand } from './status.command';
import { CurrentTrackCommand } from './current.command';
import { DisconnectCommand } from './disconnect.command';
import { EnqueueCommand } from './enqueue.command';
import { PausePlaybackCommand } from './pause.command';
import { PlayCommand } from './play.command';
import { SkipTrackCommand } from './skip.command';
import { StopPlaybackCommand } from './stop.command';
import { SummonCommand } from './summon.command';

@Module({
  imports: [DiscordModule.forFeature()],
  controllers: [],
  providers: [
    HelpCommand,
    StatusCommand,
    CurrentTrackCommand,
    DisconnectCommand,
    EnqueueCommand,
    PausePlaybackCommand,
    PlayCommand,
    SkipTrackCommand,
    StopPlaybackCommand,
    SummonCommand,
  ],
  exports: [],
})
export class CommandModule {}
