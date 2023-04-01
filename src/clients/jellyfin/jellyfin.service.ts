import { Injectable, Logger } from '@nestjs/common';

import { Api, Jellyfin } from '@jellyfin/sdk';
import { SystemApi } from '@jellyfin/sdk/lib/generated-client/api/system-api';
import { getSystemApi } from '@jellyfin/sdk/lib/utils/api/system-api';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Constants } from '../../utils/constants';
import { JellyinPlaystateService } from './jellyfin.playstate.service';

@Injectable()
export class JellyfinService {
  private readonly logger = new Logger(JellyfinService.name);
  private jellyfin: Jellyfin;
  private api: Api;
  private systemApi: SystemApi;
  private userId: string;
  private connected = false;

  constructor(
    private eventEmitter: EventEmitter2,
    private readonly jellyfinPlayState: JellyinPlaystateService,
  ) {}

  init() {
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
    this.logger.debug('Created Jellyfin Client and Api');
  }

  authenticate() {
    this.api
      .authenticateUserByName(
        process.env.JELLYFIN_AUTHENTICATION_USERNAME ?? '',
        process.env.JELLYFIN_AUTHENTICATION_PASSWORD,
      )
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

        this.systemApi = getSystemApi(this.api);
        this.connected = true;

        await this.jellyfinPlayState.initializePlayState(this.api);
      })
      .catch((test) => {
        this.logger.error(test);
        this.connected = false;
      });
  }

  destroy() {
    if (!this.api) {
      this.logger.warn(
        'Jellyfin Api Client was unexpectitly undefined. Graceful destroy has failed',
      );
      return;
    }
    this.api.logout();
    this.connected = false;
  }

  getApi() {
    return this.api;
  }

  getJellyfin() {
    return this.jellyfin;
  }

  getSystemApi() {
    return this.systemApi;
  }

  getUserId() {
    return this.userId;
  }

  isConnected() {
    return this.connected;
  }
}
