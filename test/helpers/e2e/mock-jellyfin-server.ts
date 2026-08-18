/**
 * In-memory mock of the Jellyfin HTTP API so the tests are deterministic and
 * need no real instance. Endpoints:
 *
 *  - `POST /Users/AuthenticateByName`      -> fake auth session
 *  - `POST /Sessions/Playing` and friends  -> playback reporting (200 OK)
 *  - `GET  /Audio/{id}/universal`          -> per-track Ogg/Opus stream
 *  - `ws://…/socket`                       -> keeps the bot's websocket alive
 */
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

/** An audio buffer served under `/Audio/{id}/universal`. */
export interface MockTrackFile {
  id: string;
  audio: Buffer;
}

export class MockJellyfinServer {
  private readonly httpServer: Server;
  private readonly wss: WebSocketServer;
  private readonly tracks: Map<string, Buffer>;
  private readonly fallbackAudio: Buffer;

  private address: string | null = null;
  private connections = new Set<WebSocket>();

  constructor(files: MockTrackFile[]) {
    this.tracks = new Map(files.map((f) => [f.id, f.audio]));
    this.fallbackAudio = files[0]?.audio ?? Buffer.alloc(0);

    this.httpServer = createServer((req, res) => this.handleRequest(req, res));

    this.wss = new WebSocketServer({
      server: this.httpServer,
      path: '/socket',
    });
    this.wss.on('connection', (socket) => {
      this.connections.add(socket);
      socket.on('close', () => this.connections.delete(socket));
    });
  }

  get baseUrl(): string {
    if (!this.address) {
      throw new Error('MockJellyfinServer has not been started');
    }
    return this.address;
  }

  async start(): Promise<void> {
    if (this.address) return;

    await new Promise<void>((resolve) => {
      this.httpServer.listen(0, '127.0.0.1', () => resolve());
    });

    const address = this.httpServer.address();
    if (address === null || typeof address === 'string') {
      throw new Error('MockJellyfinServer failed to bind a TCP port');
    }

    this.address = `http://127.0.0.1:${address.port}`;
  }

  async close(): Promise<void> {
    for (const socket of this.connections) {
      socket.close();
    }
    this.connections.clear();
    this.wss.close();
    await new Promise<void>((resolve) =>
      this.httpServer.close(() => resolve()),
    );
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');

    if (req.method === 'POST' && url.pathname === '/Users/AuthenticateByName') {
      this.json(res, 200, {
        User: { Name: 'e2e', Id: 'e2e-user' },
        SessionInfo: {
          UserId: 'e2e-user-id',
          UserName: 'e2e',
          NowPlayingItem: null,
        },
        AccessToken: 'e2e-access-token',
        ServerId: 'e2e-server',
      });
      return;
    }

    if (req.method === 'POST' && url.pathname.startsWith('/Sessions/')) {
      // Playback reporting: reportPlaybackStart/Stop/Progress.
      this.json(res, 200, {});
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/Audio/')) {
      this.serveAudio(res, url.pathname);
      return;
    }

    this.json(res, 404, {});
  }

  private serveAudio(res: ServerResponse, pathname: string): void {
    // Path is `/Audio/{id}/universal`.
    const id = decodeURIComponent(pathname.split('/')[2] ?? '');
    const audio = this.tracks.get(id) ?? this.fallbackAudio;

    // Ogg/Opus, matching a real Jellyfin instance. A WAV here would make the
    // bot's resource non-playable (it relies on Ogg/Opus demuxing).
    res.writeHead(200, {
      'Content-Type': 'audio/ogg',
      'Content-Length': audio.length,
      'Accept-Ranges': 'none',
    });
    res.end(audio);
  }

  private json(res: ServerResponse, status: number, body: unknown): void {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    });
    res.end(payload);
  }
}
