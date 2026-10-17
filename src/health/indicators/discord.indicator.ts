import { InjectDiscordClient } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService, } from '@nestjs/terminus';
import { Client, Status } from 'discord.js';

@Injectable()
export class DiscordHealthIndicator extends HealthIndicatorService {
  constructor(@InjectDiscordClient() private readonly client: Client) {
    super();
  }

  isHealthy(key: string): HealthIndicatorResult {
    const status = this.client.ws.status;
    const payload = {
      wsStatus: status,
      pingInMilliseconds: this.client.ws.ping,
    };

    const check = this.check(key);
    if (status === Status.Ready) {
      return check.up(payload)
    }

    return check.down(payload);
  }
}
