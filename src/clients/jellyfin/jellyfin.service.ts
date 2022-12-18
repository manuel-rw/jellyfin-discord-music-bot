import { Injectable, Logger } from '@nestjs/common';

import { Api, Jellyfin } from '@jellyfin/sdk';
import { Constants } from '../../utils/constants';
import { SystemApi } from '@jellyfin/sdk/lib/generated-client/api/system-api';
import { getSystemApi } from '@jellyfin/sdk/lib/utils/api/system-api';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class JellyfinService {
  private readonly logger = new Logger(JellyfinService.name);
  private jellyfin: Jellyfin;
  private api: Api;
  private systemApi: SystemApi;
  private userId: string;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  init() {
    this.jellyfin = new Jellyfin({
      clientInfo: {
        name: Constants.Metadata.ApplicationName,
        version: Constants.Metadata.Version,
      },
      deviceInfo: {
        id: 'jellyfin-discord-bot',
        name: 'Jellyfin Discord Bot',
      },
    });

    this.api = this.jellyfin.createApi(process.env.JELLYFIN_SERVER_ADDRESS);
    this.logger.debug('Created Jellyfin Client and Api');
  }

  authenticate() {
    this.api
      .authenticateUserByName(
        process.env.JELLYFIN_AUTHENTICATION_USERNAME,
        process.env.JELLYFIN_AUTHENTICATION_PASSWORD,
      )
      .then((response) => {
        if (response.data.SessionInfo === undefined) {
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

        this.eventEmitter.emit('clients.jellyfin.ready');
      })
      .catch((test) => {
        this.logger.error(test);
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
}
