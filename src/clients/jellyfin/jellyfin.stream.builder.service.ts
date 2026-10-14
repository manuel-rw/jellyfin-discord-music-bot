import { Injectable, Logger } from '@nestjs/common';

import { AUTHORIZATION_PARAMETER } from '@jellyfin/sdk/lib/constants';

import { JellyfinService } from './jellyfin.service';

@Injectable()
export class JellyfinStreamBuilderService {
  private readonly logger = new Logger(JellyfinStreamBuilderService.name);

  constructor(private readonly jellyfinService: JellyfinService) {}

  buildStreamUrl(jellyfinItemId: string, bitrate: number) {
    const api = this.jellyfinService.getApi();

    this.logger.debug(
      `Building stream for '${jellyfinItemId}' with bitrate ${bitrate}`,
    );

    const url = api.getUri(`Audio/${jellyfinItemId}/universal`, {
      UserId: this.jellyfinService.getUserId() ?? '',
      DeviceId: this.jellyfinService.getJellyfin().clientInfo.name,
      MaxStreamingBitrate: bitrate,
      Container: 'ogg,opus',
      AudioCodec: 'opus',
      TranscodingContainer: 'ts',
      TranscodingProtocol: 'hls',
      [AUTHORIZATION_PARAMETER]: api.accessToken,
    });

    this.logger.debug(`Built stream URL '${url}'`);

    return url;
  }
}
