import { Module } from '@nestjs/common';
import { OnModuleDestroy } from '@nestjs/common/interfaces/hooks';

import { JellyfinClientModule } from '../jellyfin/jellyfin.module';
import { PlaybackModule } from '../../playback/playback.module';

import { DiscordConfigService } from './discord.config.service';
import { DiscordMessageService } from './discord.message.service';
import { DiscordVoiceService } from './discord.voice.service';

@Module({
  imports: [PlaybackModule, JellyfinClientModule],
  controllers: [],
  providers: [DiscordConfigService, DiscordVoiceService, DiscordMessageService],
  exports: [DiscordConfigService, DiscordVoiceService, DiscordMessageService],
})
export class DiscordClientModule implements OnModuleDestroy {
  constructor(private readonly discordVoiceService: DiscordVoiceService) {}

  onModuleDestroy() {
    this.discordVoiceService.disconnectGracefully();
  }
}
