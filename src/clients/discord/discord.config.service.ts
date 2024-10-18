import {
  DiscordModuleOption,
  DiscordOptionsFactory,
} from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { BotStatusConfig } from 'src/config/status';

@Injectable()
export class DiscordConfigService implements DiscordOptionsFactory {
  createDiscordOptions(): DiscordModuleOption {
    return {
      token: process.env.DISCORD_CLIENT_TOKEN ?? '',
      discordClientOptions: {
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildIntegrations,
          GatewayIntentBits.GuildVoiceStates,
        ],
        presence: BotStatusConfig
      },
    };
  }
}
