import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ActivityType, Client } from 'discord.js';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private client: Client;

  constructor(private eventEmitter: EventEmitter2) {}

  initializeClient() {
    this.client = new Client({
      intents: ['Guilds', 'GuildMessages', 'MessageContent'],
    });
    this.logger.debug('Initialized Discord client');
  }

  connectAndLogin() {
    this.client.login(process.env.DISCORD_CLIENT_TOKEN);
  }

  registerEventHandlers() {
    this.client.on('ready', () => {
      this.logger.debug(`Connected as '${this.client.user.tag}' and ready!`);
      this.eventEmitter.emit('client.discord.ready');
    });

    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) {
        return;
      }

      await message.channel.send('nice');
    });
  }

  destroyClient() {
    this.client.destroy();
  }

  getClient() {
    return this.client;
  }
}
