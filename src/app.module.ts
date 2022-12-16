import { Module } from '@nestjs/common';
import * as Joi from 'joi';

import { DiscordModule } from '@discord-nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DiscordClientModule } from './clients/discord/discord.module';
import { JellyfinClientModule } from './clients/jellyfin/jellyfin.module';
import { CommandModule } from './commands/command.module';
import { DiscordConfigService } from './clients/discord/jellyfin.config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        DISCORD_CLIENT_TOKEN: Joi.string().required(),
        JELLYFIN_SERVER_ADDRESS: Joi.string().required(),
        JELLYFIN_AUTHENTICATION_USERNAME: Joi.string().required(),
        JELLYFIN_AUTHENTICATION_PASSWORD: Joi.string().required(),
      }),
    }),
    DiscordModule.forRootAsync({
      useClass: DiscordConfigService,
    }),
    DiscordModule,
    EventEmitterModule.forRoot(),
    CommandModule,
    DiscordClientModule,
    JellyfinClientModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
