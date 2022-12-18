import { Injectable } from '@nestjs/common';
import { JellyfinService } from './jellyfin.service';

import { getPlaystateApi } from '@jellyfin/sdk/lib/utils/api/playstate-api';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class JellyinWebsocketService {
  constructor(private readonly jellyfinClientManager: JellyfinService) {}

  @OnEvent('clients.jellyfin.ready')
  handleJellyfinBotReady() {
    console.log('ready!');

    this.openSocket();
  }

  private async openSocket() {
    const systemApi = getPlaystateApi(this.jellyfinClientManager.getApi());

    // TODO: Write socket playstate api to report playback progress
  }
}
