import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { JellyfinService } from '../../clients/jellyfin/jellyfin.service';

@Injectable()
export class JellyfinHealthIndicator extends HealthIndicator {
  constructor(private readonly jellyfinService: JellyfinService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isConnected = this.jellyfinService.isConnected();

    return this.getStatus(key, isConnected);
  }
}
