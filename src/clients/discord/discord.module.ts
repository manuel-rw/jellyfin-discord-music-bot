import { DiscordModule } from '@discord-nestjs/core';
import { Module } from '@nestjs/common';
import { OnModuleDestroy } from '@nestjs/common/interfaces/hooks';

import { JellyfinClientModule } from '../jellyfin/jellyfin.module';
import { PlaybackModule } from '../../playback/playback.module';

import { DiscordConfigService } from './discord.config.service';
import { DiscordVoiceService } from './discord.voice.service';
import { DiscordEventSubscriberService } from './discord.event-subscriber.service';
import { DiscordMessageCleanupService } from './discord.message-cleanup.service';

@Module({
  imports: [DiscordModule.forFeature(), PlaybackModule, JellyfinClientModule],
  controllers: [],
  providers: [
    DiscordConfigService,
    DiscordVoiceService,
    DiscordEventSubscriberService,
    DiscordMessageCleanupService,
  ],
  exports: [
    DiscordConfigService,
    DiscordVoiceService,
    DiscordEventSubscriberService,
    DiscordMessageCleanupService,
  ],
})
export class DiscordClientModule implements OnModuleDestroy {
  constructor(private readonly discordVoiceService: DiscordVoiceService) {}

  onModuleDestroy() {
    this.discordVoiceService.disconnectGracefully();
  }
}
