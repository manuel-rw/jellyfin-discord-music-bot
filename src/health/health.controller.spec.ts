import {
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { HealthCheckExecutor } from '@nestjs/terminus/dist/health-check/health-check-executor.service';
import { Test } from '@nestjs/testing';
import { useDefaultMockerToken } from '../utils/tests/defaultMockerToken';
import { HealthController } from './health.controller';
import { DiscordHealthIndicator } from './indicators/discord.indicator';
import { JellyfinHealthIndicator } from './indicators/jellyfin.indicator';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    })
      .useMocker((token) => {
        if (token === JellyfinHealthIndicator) {
          return {
            isHealthy: jest.fn().mockResolvedValue({
              jellyfin: {
                status: 'up',
              },
            } as HealthIndicatorResult),
          };
        }

        if (token === DiscordHealthIndicator) {
          return {
            isHealthy: jest.fn().mockResolvedValue({
              discord: {
                status: 'up',
              },
            } as HealthIndicatorResult),
          };
        }

        if (token === HealthCheckService) {
          return new HealthCheckService(new HealthCheckExecutor(), null);
        }

        return useDefaultMockerToken(token);
      })
      .compile();

    controller = moduleRef.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', async () => {
    const result = await controller.healthCheck();

    expect(result).toStrictEqual({
      details: {
        discord: {
          status: 'up',
        },
        jellyfin: {
          status: 'up',
        },
      },
      error: {},
      info: {
        discord: {
          status: 'up',
        },
        jellyfin: {
          status: 'up',
        },
      },
      status: 'ok',
    } as HealthCheckResult);
  });
});
