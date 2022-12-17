import { DiscordModule } from '@discord-nestjs/core';
import { Module } from '@nestjs/common';

import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordClientModule } from '../clients/discord/discord.module';
import { JellyfinClientModule } from '../clients/jellyfin/jellyfin.module';
import { PlaybackService } from '../playback/playback.service';
import { CurrentTrackCommand } from './current.command';
import { DisconnectCommand } from './disconnect.command';
import { EnqueueCommand } from './enqueue.command';
import { HelpCommand } from './help.command';
import { PausePlaybackCommand } from './pause.command';
import { PreviousTrackCommand } from './previous.command';
import { PlayItemCommand } from './play.comands';
import { SkipTrackCommand } from './skip.command';
import { StatusCommand } from './status.command';
import { StopPlaybackCommand } from './stop.command';
import { SummonCommand } from './summon.command';

@Module({
  imports: [
    DiscordModule.forFeature(),
    JellyfinClientModule,
    DiscordClientModule,
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
    DiscordMessageService,
    PlaybackService,
  ],
  exports: [],
})
export class CommandModule {}
