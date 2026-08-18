/**
 * Preflight checks for the e2e tests, so a broken token or unreachable gateway
 * fails fast with a precise message instead of a generic login timeout.
 *
 *  - REST: `GET /users/@me` validates the token and connectivity.
 *  - Gateway: a websocket handshake that only waits for the OP 10 `HELLO`
 *    frame. It never identifies, so it consumes no session slot and cannot
 *    interfere with the app's subsequent login.
 */
import WebSocket from 'ws';

import { withTimeout } from './async-utils';

const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';

export async function preflightDiscordToken(
  token: string,
  label: string,
): Promise<void> {
  await checkRestEndpoint(token, label);
  await checkGatewayReachability(label);
}

async function checkRestEndpoint(token: string, label: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bot ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new Error(
      `${label}: Discord REST API was not reachable from the runner ` +
        `(${(error as Error).message}). Check network connectivity to discord.com.`,
    );
  }

  if (response.status !== 200) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `${label}: Discord rejected the token (HTTP ${response.status}) ${body.trim()}. ` +
        'Is the token valid and not revoked?',
    );
  }

  const payload = (await response.json()) as { username?: string };
  // eslint-disable-next-line no-console
  console.log(
    `${label}: token is valid (Discord auth: ${payload.username ?? '?'})`,
  );
}

async function checkGatewayReachability(label: string): Promise<void> {
  await withTimeout(
    new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(DISCORD_GATEWAY, {
        handshakeTimeout: 10_000,
      });

      let settled = false;
      const finish = (fn: () => void): void => {
        if (settled) return;
        settled = true;
        fn();
      };

      ws.on('message', (data) => {
        if (settled) return;
        try {
          const op = JSON.parse(data.toString());
          if (op.op === 10) {
            finish(() => {
              ws.close();
              resolve();
            });
          }
        } catch {
          // ignore malformed frames
        }
      });

      ws.on('error', (error) => {
        finish(() =>
          reject(new Error(`gateway websocket error: ${error.message}`)),
        );
      });

      ws.on('close', (code) => {
        finish(() =>
          reject(new Error(`gateway closed unexpectedly (code ${code})`)),
        );
      });
    }),
    15_000,
    `${label}: Discord gateway (wss://gateway.discord.gg) was not reachable. ` +
      'If the REST check passed, the runner cannot reach the gateway — check ' +
      'egress/firewall rules or whether Discord is blocked in this region.',
  );

  // eslint-disable-next-line no-console
  console.log(`${label}: Discord gateway endpoint is reachable`);
}
