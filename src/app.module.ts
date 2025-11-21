import { DiscordModule } from '@discord-nestjs/core';

import { Logger, Module, OnModuleInit } from '@nestjs/common';
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
import {
  environmentVariablesSchema,
  getEnvironmentVariables,
} from './utils/environment';
import { fromZodError } from 'zod-validation-error';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate(config) {
        try {
          return environmentVariablesSchema.parse(config);
        } catch (err) {
          throw fromZodError(err);
        }
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'client'),
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
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  onModuleInit() {
    const variables = getEnvironmentVariables();

    if (!variables.ALLOW_EVERYONE_FOR_DEFAULT_PERMS) {
      return;
    }

    this.logger.warn(
      'WARNING: You are using a potentially dangerous configuration: Everyone on your server has access to your bot. Ensure, that your bot is properly secured. Disable this by setting the environment variable ALLOW_EVERYONE to false',
    );
    this.logger.warn(
      'WARNING: You are using a feature, that will only work for new server invitations. The permissions on existing servers will not be changed',
    );
  }
}
