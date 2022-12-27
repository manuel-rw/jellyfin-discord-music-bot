import { DiscordModule } from '@discord-nestjs/core';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { JellyfinClientModule } from '../clients/jellyfin/jellyfin.module';
import { HealthController } from './health.controller';
import { DiscordHealthIndicator } from './indicators/discord.indicator';
import { JellyfinHealthIndicator } from './indicators/jellyfin.indicator';

@Module({
  imports: [TerminusModule, JellyfinClientModule, DiscordModule.forFeature()],
  controllers: [HealthController],
  providers: [JellyfinHealthIndicator, DiscordHealthIndicator],
})
export class HealthModule {}
