import { HealthIndicatorResult } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import { JellyfinService } from '../../clients/jellyfin/jellyfin.service';
import { useDefaultMockerToken } from '../../utils/tests';
import { JellyfinHealthIndicator } from './jellyfin.indicator';

describe('JellyfinHealthIndicator', () => {
  let service: JellyfinHealthIndicator;
  let jellyfinService: JellyfinService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [JellyfinHealthIndicator],
    })
      .useMocker((token) => {
        if (token === JellyfinService) {
          return { isConnected: jest.fn() };
        }
        return useDefaultMockerToken(token);
      })
      .compile();

    service = moduleRef.get<JellyfinHealthIndicator>(JellyfinHealthIndicator);
    jellyfinService = moduleRef.get<JellyfinService>(JellyfinService);
  });

  it('isHealthyWhenJellyfinIsConnected', async () => {
    jest.spyOn(jellyfinService, 'isConnected').mockImplementation(() => true);
    const result = await service.isHealthy('jellyfin');

    expect(result).toStrictEqual({
      jellyfin: {
        status: 'up',
      },
    } as HealthIndicatorResult);
  });

  it('isUnhealthyWhenJellyfinIsNotConnected', async () => {
    jest.spyOn(jellyfinService, 'isConnected').mockImplementation(() => false);
    const result = await service.isHealthy('jellyfin');

    expect(result).toStrictEqual({
      jellyfin: {
        status: 'down',
      },
    } as HealthIndicatorResult);
  });
});
