import { registerFilterGlobally } from '@discord-nestjs/core';
import { Module } from '@nestjs/common';
import { OnModuleDestroy } from '@nestjs/common/interfaces/hooks';
import { CommandExecutionError } from '../../middleware/command-execution-filter';
import { PlaybackModule } from '../../playback/playback.module';
import { JellyfinClientModule } from '../jellyfin/jellyfin.module';
import { DiscordConfigService } from './discord.config.service';
import { DiscordMessageService } from './discord.message.service';
import { DiscordVoiceService } from './discord.voice.service';

@Module({
  imports: [PlaybackModule, JellyfinClientModule],
  controllers: [],
  providers: [
    DiscordConfigService,
    DiscordVoiceService,
    DiscordMessageService,
    {
      provide: registerFilterGlobally(),
      useClass: CommandExecutionError,
    },
  ],
  exports: [DiscordConfigService, DiscordVoiceService, DiscordMessageService],
})
export class DiscordClientModule implements OnModuleDestroy {
  constructor(private readonly discordVoiceService: DiscordVoiceService) {}

  onModuleDestroy() {
    this.discordVoiceService.disconnectGracefully();
  }
}
