import { Module } from '@nestjs/common';
import * as Joi from 'joi';

import { DiscordModule } from '@discord-nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { DiscordConfigService } from './clients/discord/discord.config.service';
import { DiscordClientModule } from './clients/discord/discord.module';
import { JellyfinClientModule } from './clients/jellyfin/jellyfin.module';
import { CommandModule } from './commands/command.module';
import { HealthModule } from './health/health.module';
import { PlaybackModule } from './playback/playback.module';
import { UpdatesModule } from './updates/updates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        DISCORD_CLIENT_TOKEN: Joi.string().required(),
        JELLYFIN_SERVER_ADDRESS: Joi.string().required(),
        JELLYFIN_AUTHENTICATION_USERNAME: Joi.string().required(),
        JELLYFIN_AUTHENTICATION_PASSWORD: Joi.string().required(),
        UPDATER_DISABLE_NOTIFICATIONS: Joi.boolean(),
        PORT: Joi.number().min(1),
      }),
    }),
    ScheduleModule.forRoot(),
    DiscordModule.forRootAsync({
      useClass: DiscordConfigService,
    }),
    DiscordModule,
    EventEmitterModule.forRoot(),
    CommandModule,
    DiscordClientModule,
    JellyfinClientModule,
    PlaybackModule,
    UpdatesModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
