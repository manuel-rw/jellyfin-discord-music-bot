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
    if (!this.api) {
      throw new Error(`Unexpected call before API was initialized.`);
    }
    getUserApi(this.api)
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

        await this.jellyfinPlayState.initializePlayState(this.api!);
      })
      .catch((test) => {
        this.logger.error(test);
        this.connected = false;
      });
  }

  async destroy() {
    if (!this.api) {
      this.logger.warn(
        'Jellyfin Api Client was unexpectedly undefined. Graceful destroy has failed',
      );
      return;
    }
    await this.api.logout();
    this.connected = false;
  }

  getApi() {
    if (!this.api) {
      this.initializeClient();
    }
    return this.api!;
  }

  getJellyfin() {
    if (!this.jellyfin) {
      this.initializeClient();
    }
    return this.jellyfin!;
  }

  getUserId() {
    return this.userId;
  }

  isConnected() {
    return this.connected;
  }
}
