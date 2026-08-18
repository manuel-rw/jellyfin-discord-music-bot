/**
 * "Bot under test" for the e2e tests.
 *
 * The full `AppModule` cannot be booted in vitest: `@discord-nestjs/core`
 * deadlocks during `app.init()` before the Discord login runs (its `initSubject`
 * never emits in the testing harness). We therefore drive the app's real
 * `DiscordVoiceService` directly, backed by a real discord.js `Client` and a
 * mocked Jellyfin stream, which still exercises the production voice pipeline.
 */
import { Client, GatewayIntentBits } from 'discord.js';

import { EventEmitter2 } from '@nestjs/event-emitter';

import { DiscordVoiceService } from '../../../src/clients/discord/discord.voice.service';
import { PlaybackService } from '../../../src/playback/playback.service';
import { EventNames } from '../../../src/events/names';
import { Track } from '../../../src/models/track';

import { withTimeout } from './async-utils';
import { E2eConfig } from './e2e-env';

export interface BotUnderTest {
  client: import('discord.js').Client;
  voiceService: DiscordVoiceService;
  playbackService: PlaybackService;
  eventEmitter: EventEmitter2;
  destroy: () => Promise<void>;
}

/**
 * Creates the bot under test: logs into Discord with the real bot token and
 * wires the app's `DiscordVoiceService` (with a mocked Jellyfin stream) to it.
 */
export async function createBotUnderTest(
  config: E2eConfig,
  jellyfinBaseUrl: string,
): Promise<BotUnderTest> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  });

  client.on('error', (error) => {
    // eslint-disable-next-line no-console
    console.warn(`Bot under test client error: ${error.message}`);
  });

  await withTimeout(
    client.login(config.botToken),
    30_000,
    'Bot under test did not log in. Check DISCORD_CLIENT_TOKEN is a valid bot token ' +
      'and that Discord is reachable',
  );
  await waitForClientReady(client, 20_000);

  // eslint-disable-next-line no-console
  console.log(
    `Bot under test is ready (${client.user?.tag}), visible in ${client.guilds.cache.size} guild(s): ${client.guilds.cache.map((g) => g.id).join(', ')}`,
  );

  const eventEmitter = new EventEmitter2();
  const playbackService = new PlaybackService(eventEmitter);

  const voiceService = new DiscordVoiceService(
    playbackService,
    // The Jellyfin websocket is not exercised in this test.
    { initializeAndConnect: () => undefined } as never,
    // The stream builder is wired to the mock Jellyfin server.
    {
      buildStreamUrl: (id: string) =>
        `${jellyfinBaseUrl}/Audio/${id}/universal?api_key=e2e`,
    } as never,
    eventEmitter,
  );

  // The `@OnEvent` decorators don't self-wire when the services are constructed
  // directly; replicate them so the real playback flow works end-to-end.
  eventEmitter.on(EventNames.Circuit.AnnounceTrack, (track) =>
    voiceService.handleOnNewTrack(track as Track),
  );
  eventEmitter.on(EventNames.Controls.Pause, () => voiceService.pause());
  eventEmitter.on(EventNames.Controls.Stop, (force) =>
    voiceService.stop(Boolean(force)),
  );
  eventEmitter.on(EventNames.Controls.TogglePause, () =>
    voiceService.togglePaused(),
  );
  eventEmitter.on(EventNames.Circuit.PreviousTrack, () =>
    playbackService['handlePreviousTrackEvent'](),
  );
  eventEmitter.on(EventNames.Circuit.NextTrack, () =>
    playbackService['handleNextTrackEvent'](),
  );

  return {
    client,
    voiceService,
    playbackService,
    eventEmitter,
    destroy: () => {
      // Leave the channel so the bot does not linger before the gateway closes.
      try {
        voiceService.leaveChannel();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Bot voice leave during destroy failed: ${error}`);
      }
      return client.destroy().catch(() => undefined);
    },
  };
}

function waitForClientReady(
  client: import('discord.js').Client,
  timeoutMs = 20_000,
): Promise<void> {
  if (client.ws.status === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            `Bot under test did not reach Discord Ready state (last ws.status ${client.ws.status}). ` +
              'Check DISCORD_CLIENT_TOKEN is a valid bot token that is invited to the guild.',
          ),
        ),
      timeoutMs,
    );
    client.once('clientReady', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
