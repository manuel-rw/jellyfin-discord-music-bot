import { Module } from '@nestjs/common';
import { DiscordConfigService } from './discord.config.service';

@Module({
  imports: [],
  controllers: [],
  providers: [DiscordConfigService],
  exports: [DiscordConfigService],
})
export class DiscordClientModule {}
