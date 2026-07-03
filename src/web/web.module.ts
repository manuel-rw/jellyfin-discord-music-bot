import { Module } from '@nestjs/common';
import { DiscordModule } from '@discord-nestjs/core';
import { WebController } from './web.controller';
import { DiscordClientModule } from '../clients/discord/discord.module';
import { PlaybackModule } from '../playback/playback.module';
import { JellyfinClientModule } from '../clients/jellyfin/jellyfin.module';

@Module({
  imports: [
    DiscordModule.forFeature(),
    DiscordClientModule,
    PlaybackModule,
    JellyfinClientModule,
  ],
  controllers: [WebController],
})
export class WebModule {}
