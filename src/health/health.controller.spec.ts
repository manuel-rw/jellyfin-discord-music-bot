import {
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Test } from '@nestjs/testing';

import { HealthController } from './health.controller';

import { DiscordHealthIndicator } from './indicators/discord.indicator';
import { JellyfinHealthIndicator } from './indicators/jellyfin.indicator';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: JellyfinHealthIndicator,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue({
              jellyfin: {
                status: 'up',
              },
            } as HealthIndicatorResult),
          },
        },
        {
          provide: DiscordHealthIndicator,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue({
              discord: {
                status: 'up',
              },
            } as HealthIndicatorResult),
          },
        },
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
    healthCheckService = moduleRef.get(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', async () => {
    // arrange
    jest.spyOn(healthCheckService, 'check').mockReturnValueOnce(
      Promise.resolve({
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
      }),
    );

    // act
    const result = await controller.healthCheck();

    // assert
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
    } satisfies HealthCheckResult);
    expect(jest.spyOn(healthCheckService, 'check')).toHaveBeenCalledTimes(1);
  });
});
