import { Module } from '@nestjs/common';
import * as Joi from 'joi';

import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DiscordClientModule } from './clients/discord/discord.module';
import { CommandHandlerModule } from './commands/handler/command-handler.module';
import { JellyfinClientModule } from './clients/jellyfin/jellyfin.module';

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
    EventEmitterModule.forRoot(),
    DiscordClientModule,
    JellyfinClientModule,
    CommandHandlerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
