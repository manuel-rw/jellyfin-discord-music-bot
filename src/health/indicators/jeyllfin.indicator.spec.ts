import { HealthIndicatorResult } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import { JellyfinService } from '../../clients/jellyfin/jellyfin.service';
import { JellyfinHealthIndicator } from './jellyfin.indicator';

describe('JellyfinHealthIndicator', () => {
  let service: JellyfinHealthIndicator;
  let jellyfinService: JellyfinService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        JellyfinHealthIndicator,
        {
          provide: JellyfinService,
          useValue: {
            isConnected: vi.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get<JellyfinHealthIndicator>(JellyfinHealthIndicator);
    jellyfinService = moduleRef.get<JellyfinService>(JellyfinService);
  });

  it('isHealthyWhenJellyfinIsConnected', async () => {
    vi.spyOn(jellyfinService, 'isConnected').mockImplementation(() => true);
    const result = await service.isHealthy('jellyfin');

    expect(result).toStrictEqual({
      jellyfin: {
        status: 'up',
      },
    } as HealthIndicatorResult);
  });

  it('isUnhealthyWhenJellyfinIsNotConnected', async () => {
    vi.spyOn(jellyfinService, 'isConnected').mockImplementation(() => false);
    const result = await service.isHealthy('jellyfin');

    expect(result).toStrictEqual({
      jellyfin: {
        status: 'down',
      },
    } as HealthIndicatorResult);
  });
});
