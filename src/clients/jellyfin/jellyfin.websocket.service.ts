import {
  PlaystateCommand,
  SessionMessageType,
} from '@jellyfin/sdk/lib/generated-client/models';

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { convertToTracks } from 'src/utils/trackConverter';

import { WebSocket } from 'ws';

import { PlaybackService } from '../../playback/playback.service';
import {
  PlayNowCommand,
  SessionApiSendPlaystateCommandRequest,
} from '../../types/websocket';

import { JellyfinSearchService } from './jellyfin.search.service';
import { JellyfinService } from './jellyfin.service';

@Injectable()
export class JellyfinWebSocketService implements OnModuleDestroy {
  private webSocket: WebSocket;

  private readonly logger = new Logger(JellyfinWebSocketService.name);

  constructor(
    private readonly jellyfinService: JellyfinService,
    private readonly playbackService: PlaybackService,
    private readonly jellyfinSearchService: JellyfinSearchService,
    private readonly eventEmitter: EventEmitter2,
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

  protected async messageHandler(data: any) {
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
        this.logger.log(
          `Processing ${ids.length} ids received via websocket and adding them to the queue`,
        );
        const searchHints = await this.jellyfinSearchService.getAllById(ids);
        const tracks = convertToTracks(searchHints, this.jellyfinSearchService);
        this.playbackService.getPlaylistOrDefault().enqueueTracks(tracks);
        break;
      case SessionMessageType[SessionMessageType.Playstate]:
        const sendPlaystateCommandRequest =
          msg.Data as SessionApiSendPlaystateCommandRequest;
        this.handleSendPlaystateCommandRequest(sendPlaystateCommandRequest);
        break;
      default:
        this.logger.warn(
          `Received a package from the socket of unknown type: ${msg.MessageType}`,
        );
        break;
    }
  }

  private async handleSendPlaystateCommandRequest(
    request: SessionApiSendPlaystateCommandRequest,
  ) {
    switch (request.Command) {
      case PlaystateCommand.PlayPause:
        this.eventEmitter.emit('internal.voice.controls.togglePause');
        break;
      case PlaystateCommand.Pause:
        this.eventEmitter.emit('internal.voice.controls.pause');
        break;
      case PlaystateCommand.Stop:
        this.eventEmitter.emit('internal.voice.controls.stop');
        break;
      case PlaystateCommand.NextTrack:
        this.eventEmitter.emit('internal.audio.track.next');
        break;
      case PlaystateCommand.PreviousTrack:
        this.eventEmitter.emit('internal.audio.track.previous');
        break;
      default:
        this.logger.warn(
          `Unable to process incoming playstate command request: ${request.Command}`,
        );
        break;
    }
  }

  private bindWebSocketEvents() {
    this.webSocket.on('message', this.messageHandler.bind(this));
  }

  private buildSocketUrl(baseName: string, apiToken: string, device: string) {
    const url = new URL(baseName);
    url.pathname += '/socket';
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
