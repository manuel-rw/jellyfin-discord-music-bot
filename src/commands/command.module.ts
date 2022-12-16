import { Module } from '@nestjs/common';
import { DiscordModule } from '@discord-nestjs/core';

import { HelpCommand } from './help.command';

@Module({
  imports: [DiscordModule.forFeature()],
  controllers: [],
  providers: [HelpCommand],
  exports: [],
})
export class CommandModule {}
