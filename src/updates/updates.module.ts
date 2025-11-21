import { DiscordModule } from '@discord-nestjs/core';
import { Module } from '@nestjs/common';
import { DiscordClientModule } from '../clients/discord/discord.module';
import { UpdatesService } from './updates.service';

@Module({
  imports: [DiscordModule.forFeature(), DiscordClientModule],
  providers: [UpdatesService],
  controllers: [],
  exports: [],
})
export class UpdatesModule {} // skipcq: JS-0327
