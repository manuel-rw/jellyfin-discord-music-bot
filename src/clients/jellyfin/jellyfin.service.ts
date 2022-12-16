import { Injectable, Logger } from '@nestjs/common';

import { Api, Jellyfin } from '@jellyfin/sdk';

import { Constants } from 'src/utils/constants';

@Injectable()
export class JellyfinService {
  private readonly logger = new Logger(JellyfinService.name);
  private jellyfin: Jellyfin;
  private api: Api;

  constructor() {}

  init() {
    this.jellyfin = new Jellyfin({
      clientInfo: {
        name: Constants.Metadata.ApplicationName,
        version: Constants.Metadata.Version,
      },
      deviceInfo: {
        id: 'test',
        name: 'test',
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
      })
      .catch((test) => {
        this.logger.error(test);
      });
  }

  destroy() {
    if (this.api === undefined) {
      this.logger.warn(
        'Jellyfin Api Client was unexpectitly undefined. Graceful destroy has failed',
      );
      return;
    }
    this.api.logout();
  }
}
