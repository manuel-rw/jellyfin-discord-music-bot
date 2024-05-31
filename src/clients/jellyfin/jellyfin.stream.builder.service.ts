import { Injectable, Logger } from '@nestjs/common';

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

    const accessToken = this.jellyfinService.getApi().accessToken;

    const url = new URL(api.basePath);
    if (!url.pathname.endsWith('/')) {
      url.pathname += "/";
    }
    url.pathname += `Audio/${jellyfinItemId}/universal`;
    url.searchParams.set('UserId', this.jellyfinService.getUserId());
    url.searchParams.set(
      'DeviceId',
      this.jellyfinService.getJellyfin().clientInfo.name,
    );
    url.searchParams.set('MaxStreamingBitrate', `${bitrate}`);
    /*
    url.searchParams.set(
      'Container',
      'opus,webm|opus,mp3,aac,m4a|aac,m4b|aac,flac,webma,webm|webma,wav,ogg',
    );
    url.searchParams.set('AudioCodec', 'aac');
    url.searchParams.set('TranscodingContainer', 'mp4');
    */

    url.searchParams.set('Container', 'ogg,opus');
    url.searchParams.set('AudioCodec', 'opus');
    url.searchParams.set('TranscodingContainer', 'ts');
    url.searchParams.set('TranscodingProtocol', 'hls');
    url.searchParams.set('api_key', accessToken);

    this.logger.debug(`Built stream URL '${url}'`);

    return url.toString();
  }
}
