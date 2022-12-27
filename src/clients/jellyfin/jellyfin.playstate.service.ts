import { Injectable, Logger } from '@nestjs/common';

import { Api } from '@jellyfin/sdk';
import { PlaystateApi } from '@jellyfin/sdk/lib/generated-client/api/playstate-api';
import { SessionApi } from '@jellyfin/sdk/lib/generated-client/api/session-api';
import {
  BaseItemKind,
  GeneralCommandType,
} from '@jellyfin/sdk/lib/generated-client/models';
import { getPlaystateApi } from '@jellyfin/sdk/lib/utils/api/playstate-api';
import { getSessionApi } from '@jellyfin/sdk/lib/utils/api/session-api';

@Injectable()
export class JellyinPlaystateService {
  private playstateApi: PlaystateApi;
  private sessionApi: SessionApi;

  private readonly logger = new Logger(JellyinPlaystateService.name);

  async initializePlayState(api: Api) {
    this.initializeApis(api);
    await this.reportCapabilities();
  }

  private async initializeApis(api: Api) {
    this.sessionApi = getSessionApi(api);
    this.playstateApi = getPlaystateApi(api);
  }

  private async reportCapabilities() {
    await this.sessionApi.postCapabilities({
      playableMediaTypes: [BaseItemKind[BaseItemKind.Audio]],
      supportsMediaControl: true,
      supportedCommands: [
        GeneralCommandType.SetRepeatMode,
        GeneralCommandType.Play,
        GeneralCommandType.PlayState,
      ],
    });

    this.logger.debug('Reported playback capabilities sucessfully');
  }
}
