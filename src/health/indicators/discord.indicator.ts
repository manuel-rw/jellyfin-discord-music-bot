import { InjectDiscordClient } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { Client, Status } from 'discord.js';

@Injectable()
export class DiscordHealthIndicator extends HealthIndicator {
  constructor(@InjectDiscordClient() private readonly client: Client) {
    super();
  }

  isHealthy(key: string): HealthIndicatorResult {
    const status = this.client.ws.status;

    return this.getStatus(key, status === Status.Ready, {
      wsStatus: status,
      pingInMilliseconds: this.client.ws.ping,
    });
  }
}
