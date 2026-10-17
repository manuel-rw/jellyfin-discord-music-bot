import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { JellyfinService } from '../../clients/jellyfin/jellyfin.service';

@Injectable()
export class JellyfinHealthIndicator extends HealthIndicatorService {
  constructor(private readonly jellyfinService: JellyfinService) {
    super();
  }

  isHealthy(key: string): HealthIndicatorResult {
    const isConnected = this.jellyfinService.isConnected();

    if (isConnected) return this.check(key).up();
    return this.check(key).down();
  }
}
