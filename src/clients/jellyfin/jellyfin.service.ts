// noinspection ES6UnusedImports

import { Injectable, Logger } from '@nestjs/common';

import { Api, Jellyfin } from '@jellyfin/sdk';
import { Constants } from '../../utils/constants';
import { JellyfinPlayStateService } from './jellyfinPlayStateService';
import { getUserApi } from '@jellyfin/sdk/lib/utils/api';

@Injectable()
export class JellyfinService {
  private readonly logger = new Logger(JellyfinService.name);
  private jellyfin?: Jellyfin;
  private api?: Api;
  private userId?: string;
  private connected = false;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private reconnecting = false;

  private static readonly RECONNECT_INTERVAL_MS = 5000;

  constructor(private readonly jellyfinPlayState: JellyfinPlayStateService) {}

  init() {
    this.initializeClient();
    this.logger.debug('Created Jellyfin Client and Api');
  }

  initializeClient() {
    this.jellyfin = new Jellyfin({
      clientInfo: {
        name: Constants.Metadata.ApplicationName,
        version: Constants.Metadata.Version.All(),
      },
      deviceInfo: {
        id: 'jellyfin-discord-bot',
        name: 'Jellyfin Discord Bot',
      },
    });

    this.api = this.jellyfin.createApi(
      process.env.JELLYFIN_SERVER_ADDRESS ?? '',
    );
  }

  authenticate() {
    const api = this.api;
    if (!api) {
      throw new Error('Unexpected call before API was initialized.');
    }
    getUserApi(api)
      .authenticateUserByName({
        authenticateUserByName: {
          Username: process.env.JELLYFIN_AUTHENTICATION_USERNAME ?? '',
          Pw: process.env.JELLYFIN_AUTHENTICATION_PASSWORD,
        },
      })
      .then(async (response) => {
        if (response.data.SessionInfo?.UserId === undefined) {
          this.logger.error(
            `Failed to authenticate with response code ${response.status}: '${response.data}'`,
          );
          return;
        }

        this.logger.debug(
          `Connected using user '${response.data.SessionInfo.UserId}'`,
        );
        this.userId = response.data.SessionInfo.UserId;
        this.connected = true;

        await this.jellyfinPlayState.initializePlayState(api);
      })
      .catch((test) => {
        this.logger.error(test);
        this.connected = false;
        this.scheduleReconnect();
      });
  }

  async destroy() {
    this.cancelReconnect();
    if (!this.api) {
      this.logger.warn(
        'Jellyfin Api Client was unexpectedly undefined. Graceful destroy has failed',
      );
      return;
    }
    await this.api.logout();
    this.connected = false;
  }

  private scheduleReconnect() {
    if (this.reconnecting) {
      return;
    }
    this.reconnecting = true;
    this.logger.warn(
      `Jellyfin connection lost. Reconnecting in ${JellyfinService.RECONNECT_INTERVAL_MS}ms...`,
    );
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnecting = false;
      this.reconnectTimeoutId = null;
      this.logger.log('Attempting to reconnect to Jellyfin...');
      if (!this.api) {
        this.initializeClient();
      }
      this.authenticate();
    }, JellyfinService.RECONNECT_INTERVAL_MS);
  }

  private cancelReconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.reconnecting = false;
  }

  getApi() {
    if (!this.api) {
      this.initializeClient();
    }
    if (!this.api) {
      throw new Error('Jellyfin API failed to initialize.');
    }
    return this.api;
  }

  getJellyfin() {
    if (!this.jellyfin) {
      this.initializeClient();
    }
    if (!this.jellyfin) {
      throw new Error('Jellyfin client failed to initialize.');
    }
    return this.jellyfin;
  }

  getUserId() {
    return this.userId;
  }

  isConnected() {
    return this.connected;
  }
}
