import {
  DiscordModuleOption,
  DiscordOptionsFactory,
} from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';

@Injectable()
export class DiscordConfigService implements DiscordOptionsFactory {
  createDiscordOptions(): DiscordModuleOption {
    // Get shard info from environment variables set by ShardingManager
    const shardId = process.env.SHARD_ID
      ? parseInt(process.env.SHARD_ID)
      : undefined;
    const totalShards = process.env.SHARD_COUNT
      ? parseInt(process.env.SHARD_COUNT)
      : undefined;

    // Configure sharding options for the Discord client
    const shardOptions: Record<string, any> = {};

    if (shardId !== undefined && totalShards !== undefined) {
      shardOptions.shards = shardId;
      shardOptions.shardCount = totalShards;
    }

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
        ...shardOptions,
      },
    };
  }
}
