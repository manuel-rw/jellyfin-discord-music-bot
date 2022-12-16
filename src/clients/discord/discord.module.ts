import { Module } from '@nestjs/common';
import { OnModuleDestroy } from '@nestjs/common/interfaces/hooks';
import { DiscordConfigService } from './discord.config.service';
import { DiscordVoiceService } from './discord.voice.service';

@Module({
  imports: [],
  controllers: [],
  providers: [DiscordConfigService, DiscordVoiceService],
  exports: [DiscordConfigService],
})
export class DiscordClientModule implements OnModuleDestroy {
  constructor(private readonly discordVoiceService: DiscordVoiceService) {}

  onModuleDestroy() {
    this.discordVoiceService.disconnectGracefully();
  }
}
