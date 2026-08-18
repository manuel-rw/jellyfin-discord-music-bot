import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import request from 'supertest';

import { PlaybackModule } from '../src/playback/playback.module';
import { WebController } from '../src/web/web.controller';
import { DISCORD_CLIENT_INJECTION_TOKEN } from './helpers/e2e/e2e-env';
import { DiscordVoiceService } from '../src/clients/discord/discord.voice.service';
import { JellyfinService } from '../src/clients/jellyfin/jellyfin.service';
import { JellyfinStreamBuilderService } from '../src/clients/jellyfin/jellyfin.stream.builder.service';

/**
 * E2e test for the web API. Unlike the Discord e2e specs this does not require
 * live credentials: the Discord and Jellyfin clients are mocked so the endpoint
 * can be exercised in isolation (and in CI).
 */
describe('WebController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PlaybackModule, EventEmitterModule.forRoot()],
      controllers: [WebController],
      providers: [
        {
          provide: DISCORD_CLIENT_INJECTION_TOKEN,
          useValue: {
            ws: { status: 1 },
            guilds: { cache: { map: () => [] } },
            channels: { cache: new Map() },
          },
        },
        {
          provide: DiscordVoiceService,
          useValue: {
            getVoiceConnection: () => ({}),
            isPaused: () => false,
            getVoiceChannelInfo: () => null,
            leaveChannel: () => undefined,
            joinChannel: () => undefined,
            togglePaused: () => undefined,
            stop: () => undefined,
            changeCurrentResourceVolume: () => undefined,
          },
        },
        {
          provide: JellyfinService,
          useValue: {
            isConnected: () => true,
            getApi: () => ({
              basePath: 'http://jellyfin.local',
              accessToken: 'x',
            }),
          },
        },
        JellyfinStreamBuilderService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/web/status reports the current playback state', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/web/status')
      .expect(200);

    expect(res.body).toMatchObject({
      discordConnected: false,
      jellyfinConnected: true,
      voiceConnection: { connected: true },
      paused: false,
      volume: 1,
      activeTrack: null,
    });
    expect(res.body.queueLength).toBe(0);
    expect(res.body.queuePosition).toBeUndefined();
  });

  it('GET /api/web/guilds returns an empty list without a connected client', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/web/guilds')
      .expect(200);

    expect(res.body).toEqual([]);
  });
});
