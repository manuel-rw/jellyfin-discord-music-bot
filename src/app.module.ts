import { DiscordModule } from '@discord-nestjs/core';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DiscordConfigService } from './clients/discord/discord.config.service';
import { DiscordClientModule } from './clients/discord/discord.module';
import { JellyfinClientModule } from './clients/jellyfin/jellyfin.module';
import { CommandModule } from './commands/command.module';
import { HealthModule } from './health/health.module';
import { PlaybackModule } from './playback/playback.module';
import { UpdatesModule } from './updates/updates.module';
import { environmentVariablesSchema } from './utils/environment';
import { fromZodError } from 'zod-validation-error';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate(config) {
        try {
          const parsed = environmentVariablesSchema.parse(config);
          return parsed;
        } catch (err) {
          throw fromZodError(err);
        }
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
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
