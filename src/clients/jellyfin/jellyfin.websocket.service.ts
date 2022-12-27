import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JellyfinService } from './jellyfin.service';

import { SessionMessageType } from '@jellyfin/sdk/lib/generated-client/models';
import { WebSocket } from 'ws';
import { PlaybackService } from '../../playback/playback.service';
import { JellyfinSearchService } from './jellyfin.search.service';
import { JellyfinStreamBuilderService } from './jellyfin.stream.builder.service';
import { Track } from '../../types/track';
import { PlayNowCommand } from '../../types/websocket';

@Injectable()
export class JellyfinWebSocketService implements OnModuleDestroy {
  private webSocket: WebSocket;

  private readonly logger = new Logger(JellyfinWebSocketService.name);

  constructor(
    private readonly jellyfinService: JellyfinService,
    private readonly jellyfinSearchService: JellyfinSearchService,
    private readonly playbackService: PlaybackService,
    private readonly jellyfinStreamBuilderService: JellyfinStreamBuilderService,
  ) {}

  @Cron('*/30 * * * * *')
  private handlePeriodicAliveMessage() {
    if (
      this.webSocket === undefined ||
      this.webSocket.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    this.sendMessage('KeepAlive');
    this.logger.debug('Sent a KeepAlive package to the server');
  }

  initializeAndConnect() {
    const deviceId = this.jellyfinService.getJellyfin().deviceInfo.id;
    const url = this.buildSocketUrl(
      this.jellyfinService.getApi().basePath,
      this.jellyfinService.getApi().accessToken,
      deviceId,
    );

    this.logger.debug(`Opening WebSocket with client id ${deviceId}...`);

    this.webSocket = new WebSocket(url);
    this.bindWebSocketEvents();
  }

  disconnect() {
    if (!this.webSocket) {
      this.logger.warn(
        'Tried to disconnect but WebSocket was unexpectitly undefined',
      );
      return;
    }

    this.logger.debug('Closing WebSocket...');
    this.webSocket.close();
  }

  sendMessage(type: string, data?: any) {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      throw new Error('Socket not open');
    }

    const obj: Record<string, any> = { MessageType: type };
    if (data) obj.Data = data;

    this.webSocket.send(JSON.stringify(obj));
  }

  getReadyState() {
    return this.webSocket.readyState;
  }

  protected messageHandler(data: any) {
    const msg: JellyMessage<unknown> = JSON.parse(data);

    switch (msg.MessageType) {
      case SessionMessageType[SessionMessageType.KeepAlive]:
      case SessionMessageType[SessionMessageType.ForceKeepAlive]:
        this.logger.debug(
          `Received a ${msg.MessageType} package from the server`,
        );
        break;
      case SessionMessageType[SessionMessageType.Play]:
        const data = msg.Data as PlayNowCommand;
        data.hasSelection = PlayNowCommand.prototype.hasSelection;
        data.getSelection = PlayNowCommand.prototype.getSelection;
        const ids = data.getSelection();

        this.logger.debug(
          `Adding ${ids.length} ids to the queue using controls from the websocket`,
        );

        ids.forEach((id, index) => {
          this.jellyfinSearchService
            .getById(id)
            .then((response) => {
              const track: Track = {
                name: response.Name,
                durationInMilliseconds: response.RunTimeTicks / 10000,
                jellyfinId: response.Id,
                streamUrl: this.jellyfinStreamBuilderService.buildStreamUrl(
                  response.Id,
                  96000,
                ),
                remoteImages: {
                  Images: [],
                  Providers: [],
                  TotalRecordCount: 0,
                },
              };

              const trackId = this.playbackService.enqueueTrack(track);

              if (index !== 0) {
                return;
              }

              this.playbackService.setActiveTrack(trackId);
              this.playbackService.getActiveTrackAndEmitEvent();
            })
            .catch((err) => {
              this.logger.error(err);
            });
        });
        break;
      default:
        this.logger.warn(
          `Received a package from the socket of unknown type: ${msg.MessageType}`,
        );
        break;
    }
  }

  private bindWebSocketEvents() {
    this.webSocket.on('message', this.messageHandler.bind(this));
  }

  private buildSocketUrl(baseName: string, apiToken: string, device: string) {
    const url = new URL(baseName);
    url.pathname = '/socket';
    url.protocol = url.protocol.replace('http', 'ws');
    url.search = `?api_key=${apiToken}&deviceId=${device}`;
    return url;
  }

  onModuleDestroy() {
    this.disconnect();
  }
}

export interface JellyMessage<T> {
  MessageType: string;
  MessageId?: string;
  Data: T;
}

interface JellySockEvents {
  connected: (s: JellySock, ws: WebSocket) => any;
  message: (s: JellySock, msg: JellyMessage<any>) => any;
  disconnected: () => any;
}

export declare interface JellySock {
  on<U extends keyof JellySockEvents>(
    event: U,
    listener: JellySockEvents[U],
  ): this;

  once<U extends keyof JellySockEvents>(
    event: U,
    listener: JellySockEvents[U],
  ): this;

  emit<U extends keyof JellySockEvents>(
    event: U,
    ...args: Parameters<JellySockEvents[U]>
  ): boolean;
}
