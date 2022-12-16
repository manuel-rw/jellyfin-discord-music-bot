import { Module } from '@nestjs/common';
import { DiscordModule } from '@discord-nestjs/core';

import { HelpCommand } from './help.command';
import { StatusCommand } from './status.command';

@Module({
  imports: [DiscordModule.forFeature()],
  controllers: [],
  providers: [HelpCommand, StatusCommand],
  exports: [],
})
export class CommandModule {}
