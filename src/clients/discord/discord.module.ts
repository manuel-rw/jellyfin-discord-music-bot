import { Module } from '@nestjs/common';
import { OnModuleDestroy } from '@nestjs/common/interfaces/hooks';
import { PlaybackModule } from '../../playback/playback.module';
import { DiscordConfigService } from './discord.config.service';
import { DiscordMessageService } from './discord.message.service';
import { DiscordVoiceService } from './discord.voice.service';

@Module({
  imports: [PlaybackModule],
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
