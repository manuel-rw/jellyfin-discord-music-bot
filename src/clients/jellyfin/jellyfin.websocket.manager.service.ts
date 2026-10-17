import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebSocket } from 'ws';
import { Api } from '@jellyfin/sdk';
import { AUTHORIZATION_PARAMETER } from '@jellyfin/sdk/lib/constants';
import { WEBSOCKET_URL_PATH } from '@jellyfin/sdk/lib/websocket/constants';
import { buildWebSocketUrl } from '@jellyfin/sdk/lib/utils';

import { PlaybackService } from '../../playback/playback.service';
import { JellyfinSearchService } from './search/jellyfin.search.service';
import { JellyfinService } from './jellyfin.service';
import {
  PlayNowCommand,
  SessionApiSendPlayStateCommandRequest,
} from '../../types/websocket';
import {
  PlaystateCommand,
  SessionMessageType,
} from '@jellyfin/sdk/lib/generated-client/models';
import { flatMapTrackItems } from '../../utils/trackConverter';
import { EventNames } from '../../events/names';

/**
 * Manages multiple WebSocket connections for different guilds/shards
 * Each guild that the bot joins gets its own WebSocket connection to Jellyfin
 */
@Injectable()
export class JellyfinWebSocketManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(JellyfinWebSocketManagerService.name);
  private webSockets: Map<string, WebSocket> = new Map();
  private reconnectTimeoutIds: Map<string, NodeJS.Timeout> = new Map();
  private reconnecting: Map<string, boolean> = new Map();

  private static readonly RECONNECT_INTERVAL_MS = 5000;

  constructor(
    private readonly jellyfinService: JellyfinService,
    private readonly playbackService: PlaybackService,
    private readonly jellyfinSearchService: JellyfinSearchService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Initialize and connect a WebSocket for a specific guild
   * @param guildId The Discord guild ID to create a WebSocket connection for
   */
  initializeAndConnect(guildId: string) {
    // Clean up any existing connection for this guild
    this.disconnectGuild(guildId);

    const api = this.jellyfinService.getApi();
    const deviceId = `${this.jellyfinService.getJellyfin().deviceInfo.id}-${guildId}`;
    const url = JellyfinWebSocketManagerService.buildSocketUrl(api, deviceId);

    this.logger.debug(
      `Opening WebSocket for guild ${guildId} with client id ${deviceId}...`,
    );

    const webSocket = new WebSocket(url);
    this.webSockets.set(guildId, webSocket);
    this.reconnecting.set(guildId, false);
    this.bindWebSocketEvents(guildId, webSocket);
  }

  /**
   * Disconnect WebSocket for a specific guild
   * @param guildId The Discord guild ID to disconnect
   */
  disconnectGuild(guildId: string) {
    this.cancelReconnect(guildId);
    const webSocket = this.webSockets.get(guildId);

    if (webSocket) {
      this.logger.debug(`Closing WebSocket for guild ${guildId}...`);
      webSocket.close();
      this.webSockets.delete(guildId);
    }
  }

  /**
   * Send a message through a specific guild's WebSocket
   * @param guildId The Discord guild ID
   * @param type The message type
   * @param data Optional data to send
   */
  sendMessage(guildId: string, type: string, data?: any) {
    const webSocket = this.webSockets.get(guildId);

    if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
      throw new Error(`Socket for guild ${guildId} not open`);
    }

    const obj: Record<string, any> = { MessageType: type };
    if (data) obj.Data = data;

    webSocket.send(JSON.stringify(obj));
  }

  /**
   * Get the WebSocket for a specific guild
   * @param guildId The Discord guild ID
   * @returns The WebSocket instance or undefined if not found
   */
  getWebSocket(guildId: string): WebSocket | undefined {
    return this.webSockets.get(guildId);
  }

  /**
   * Check if a WebSocket connection exists for a guild
   * @param guildId The Discord guild ID
   * @returns True if a WebSocket connection exists
   */
  hasWebSocket(guildId: string): boolean {
    return this.webSockets.has(guildId);
  }

  /**
   * Get all active guild WebSocket connections
   * @returns Map of guild IDs to WebSocket instances
   */
  getAllWebSockets(): Map<string, WebSocket> {
    return new Map(this.webSockets);
  }

  /**
   * Disconnect all WebSocket connections
   */
  disconnectAll() {
    this.logger.debug('Disconnecting all WebSocket connections...');

    for (const [guildId, webSocket] of this.webSockets) {
      this.cancelReconnect(guildId);
      webSocket.close();
    }

    this.webSockets.clear();
    this.reconnectTimeoutIds.clear();
    this.reconnecting.clear();
  }

  /**
   * Handle periodic alive messages for all active connections
   */
  sendAliveMessages() {
    for (const [guildId, webSocket] of this.webSockets) {
      if (webSocket.readyState !== WebSocket.OPEN) {
        continue;
      }

      this.sendMessage(guildId, 'KeepAlive');
      this.logger.debug(
        `Sent a KeepAlive package to the server for guild ${guildId}`,
      );
    }
  }

  private bindWebSocketEvents(guildId: string, webSocket: WebSocket) {
    webSocket.on('message', this.createMessageHandler(guildId).bind(this));
    webSocket.on('close', () => {
      this.logger.warn(
        `WebSocket for guild ${guildId} closed. Scheduling reconnect...`,
      );
      this.scheduleReconnect(guildId);
    });
    webSocket.on('error', (err) => {
      this.logger.error(`WebSocket error for guild ${guildId}: ${err.message}`);
      webSocket.close();
    });
  }

  private createMessageHandler(guildId: string) {
    return async (data: any) => {
      const msg: JellyMessage<unknown> = JSON.parse(data);

      switch (msg.MessageType) {
        case SessionMessageType[SessionMessageType.KeepAlive]:
        case SessionMessageType[SessionMessageType.ForceKeepAlive]: {
          this.logger.debug(
            `Received a ${msg.MessageType} package from the server for guild ${guildId}`,
          );
          break;
        }
        case SessionMessageType[SessionMessageType.Play]: {
          const playData = msg.Data as PlayNowCommand;
          playData.hasSelection = PlayNowCommand.prototype.hasSelection;
          playData.getSelection = PlayNowCommand.prototype.getSelection;
          const ids = playData.getSelection();
          this.logger.log(
            `Processing ${ids.length} ids received via websocket for guild ${guildId} and adding them to the queue`,
          );
          const searchHints = await this.jellyfinSearchService.getAllById(ids);
          const tracks = await flatMapTrackItems(
            searchHints,
            this.jellyfinSearchService,
          );
          this.logger.debug(
            `Mapped ${tracks.length} tracks to Jellyfin for guild ${guildId}`,
          );
          this.playbackService.getPlaylistOrDefault().enqueueTracks(tracks);
          break;
        }
        case SessionMessageType[SessionMessageType.Playstate]: {
          const sendPlayStateCommandRequest =
            msg.Data as SessionApiSendPlayStateCommandRequest;
          this.handleSendPlayStateCommandRequest(sendPlayStateCommandRequest);
          break;
        }
        case SessionMessageType[SessionMessageType.UserDataChanged]:
          break;
        case SessionMessageType[SessionMessageType.GeneralCommand]:
          this.handleGeneralCommand(msg, guildId);
          break;
        default:
          this.logger.warn(
            `Received a package from the socket of unknown type for guild ${guildId}: ${msg.MessageType}`,
          );
          break;
      }
    };
  }

  private handleSendPlayStateCommandRequest(
    request: SessionApiSendPlayStateCommandRequest,
  ) {
    switch (request.Command) {
      case PlaystateCommand.PlayPause:
        this.eventEmitter.emit(EventNames.Controls.TogglePause);
        break;
      case PlaystateCommand.Pause:
        this.eventEmitter.emit(EventNames.Controls.Pause);
        break;
      case PlaystateCommand.Stop:
        this.eventEmitter.emit(EventNames.Controls.Stop);
        break;
      case PlaystateCommand.NextTrack:
        this.eventEmitter.emit(EventNames.Circuit.NextTrack);
        break;
      case PlaystateCommand.PreviousTrack:
        this.eventEmitter.emit(EventNames.Circuit.PreviousTrack);
        break;
      default:
        this.logger.warn(
          `Unable to process incoming play state command request: ${request.Command}`,
        );
        break;
    }
  }

  private static buildSocketUrl(api: Api, device: string) {
    return buildWebSocketUrl(
      api.getUri(WEBSOCKET_URL_PATH, {
        [AUTHORIZATION_PARAMETER]: api.accessToken,
        deviceId: device,
      }),
    );
  }

  onModuleDestroy() {
    this.disconnectAll();
  }

  private scheduleReconnect(guildId: string) {
    if (this.reconnecting.get(guildId)) {
      return;
    }
    this.reconnecting.set(guildId, true);
    this.logger.warn(
      `WebSocket for guild ${guildId} disconnected. Reconnecting in ${JellyfinWebSocketManagerService.RECONNECT_INTERVAL_MS}ms...`,
    );

    const timeoutId = setTimeout(() => {
      this.reconnecting.set(guildId, false);
      this.reconnectTimeoutIds.delete(guildId);
      this.logger.log(
        `Attempting to reconnect WebSocket for guild ${guildId}...`,
      );
      this.initializeAndConnect(guildId);
    }, JellyfinWebSocketManagerService.RECONNECT_INTERVAL_MS);

    this.reconnectTimeoutIds.set(guildId, timeoutId);
  }

  private cancelReconnect(guildId: string) {
    const timeoutId = this.reconnectTimeoutIds.get(guildId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.reconnectTimeoutIds.delete(guildId);
    }
    this.reconnecting.set(guildId, false);
  }

  private handleGeneralCommand(msg: JellyMessage<unknown>, guildId: string) {
    this.logger.warn(`Guild ${guildId}: ${JSON.stringify(msg)}`);
    // Handle general commands (like volume changes)
    // This is a simplified version - you might want to add proper validation
    if (msg.Data && typeof msg.Data === 'object') {
      const data = msg.Data as Record<string, any>;
      if (data.Name === 'SetVolume') {
        const volume = Number(data.Arguments?.Volume) / 100;
        this.eventEmitter.emit(EventNames.Controls.SetVolume, {
          volume: volume,
        });
      }
    }
  }
}

export interface JellyMessage<T> {
  MessageType: string;
  MessageId?: string;
  Data: T;
}
