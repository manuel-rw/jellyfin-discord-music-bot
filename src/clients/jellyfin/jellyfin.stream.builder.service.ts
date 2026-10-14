import { Injectable, Logger } from '@nestjs/common';

import { AUTHORIZATION_PARAMETER } from '@jellyfin/sdk/lib/constants';

import { JellyfinService } from './jellyfin.service';

@Injectable()
export class JellyfinStreamBuilderService {
  private readonly logger = new Logger(JellyfinStreamBuilderService.name);

  constructor(private readonly jellyfinService: JellyfinService) {}

  buildStreamUrl(jellyfinItemId: string) {
    const api = this.jellyfinService.getApi();

    this.logger.debug(`Building stream for '${jellyfinItemId}'`);

    const url = api.getUri(`Audio/${jellyfinItemId}/universal`, {
      UserId: this.jellyfinService.getUserId() ?? '',
      DeviceId: this.jellyfinService.getJellyfin().clientInfo.name,
      // The stream is piped through FFmpeg, which decodes all of these
      // formats locally. Requesting direct play for them avoids a server
      // side transcode. Anything else is transcoded to Opus.
      Container: 'mp3,flac,m4a,aac,webma,wav,ogg,opus',
      AudioCodec: 'opus,flac,mp3,aac,vorbis',
      TranscodingContainer: 'ogg',
      [AUTHORIZATION_PARAMETER]: api.accessToken,
    });

    this.logger.debug(`Built stream URL '${url}'`);

    return url;
  }
}
