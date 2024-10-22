import { DiscordModule } from '@discord-nestjs/core';
import { Module } from '@nestjs/common';

import { DiscordClientModule } from '../clients/discord/discord.module';
import { JellyfinClientModule } from '../clients/jellyfin/jellyfin.module';
import { PlaybackModule } from '../playback/playback.module';
import { PlaylistCommand } from './playlist/playlist.command';
import { DisconnectCommand } from './disconnect.command';
import { HelpCommand } from './help.command';
import { PausePlaybackCommand } from './pause.command';
import { PlayItemCommand } from './play/play.command';
import { PreviousTrackCommand } from './previous.command';
import { SkipTrackCommand } from './next.command';
import { StatusCommand } from './status.command';
import { StopPlaybackCommand } from './stop.command';
import { SummonCommand } from './summon.command';
import { PlaylistInteractionCollector } from './playlist/playlist.interaction-collector';
import { EnqueueRandomItemsCommand } from './random/random.command';
import { VolumeCommand } from './volume/volume.command';
import { ShuffleCommand } from './shuffle.command';
import { BotStatusCommand } from './bot_status/bot_status.command';

@Module({
  imports: [
    DiscordModule.forFeature(),
    JellyfinClientModule,
    DiscordClientModule,
    PlaybackModule,
  ],
  controllers: [],
  providers: [
    PlaylistInteractionCollector,
    HelpCommand,
    StatusCommand,
    EnqueueRandomItemsCommand,
    PlaylistCommand,
    DisconnectCommand,
    PausePlaybackCommand,
    SkipTrackCommand,
    StopPlaybackCommand,
    SummonCommand,
    PlayItemCommand,
    PreviousTrackCommand,
    VolumeCommand,
    ShuffleCommand,
    BotStatusCommand,
  ],
  exports: [],
})
export class CommandModule { }
