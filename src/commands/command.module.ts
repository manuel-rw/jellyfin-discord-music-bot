import { DiscordModule } from '@discord-nestjs/core';
import { Module } from '@nestjs/common';

import { DiscordClientModule } from '../clients/discord/discord.module';
import { JellyfinClientModule } from '../clients/jellyfin/jellyfin.module';
import { PlaybackModule } from '../playback/playback.module';
import { CurrentTrackCommand } from './current.command';
import { DisconnectCommand } from './disconnect.command';
import { EnqueueCommand } from './enqueue.command';
import { HelpCommand } from './help.command';
import { PausePlaybackCommand } from './pause.command';
import { PlayItemCommand } from './play.comands';
import { PreviousTrackCommand } from './previous.command';
import { SkipTrackCommand } from './skip.command';
import { StatusCommand } from './status.command';
import { StopPlaybackCommand } from './stop.command';
import { SummonCommand } from './summon.command';

@Module({
  imports: [
    DiscordModule.forFeature(),
    JellyfinClientModule,
    DiscordClientModule,
    PlaybackModule,
  ],
  controllers: [],
  providers: [
    HelpCommand,
    StatusCommand,
    CurrentTrackCommand,
    DisconnectCommand,
    EnqueueCommand,
    PausePlaybackCommand,
    SkipTrackCommand,
    StopPlaybackCommand,
    SummonCommand,
    PlayItemCommand,
    PreviousTrackCommand,
  ],
  exports: [],
})
export class CommandModule {}
