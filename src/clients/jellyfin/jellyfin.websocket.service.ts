import { Injectable } from '@nestjs/common';
import { JellyfinService } from './jellyfin.service';

import { getPlaystateApi } from '@jellyfin/sdk/lib/utils/api/playstate-api';

@Injectable()
export class JellyinWebsocketService {
  constructor(private readonly jellyfinClientManager: JellyfinService) {}

  async openSocket() {
    const systemApi = getPlaystateApi(this.jellyfinClientManager.getApi());

    // TODO: Write socket playstate api to report playback progress
  }
}
