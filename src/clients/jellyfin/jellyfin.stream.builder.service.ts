import { Injectable, Logger } from '@nestjs/common';
import { JellyfinService } from './jellyfin.service';

@Injectable()
export class JellyfinStreamBuilderService {
  private readonly logger = new Logger(JellyfinStreamBuilderService.name);

  constructor(private readonly jellyfinService: JellyfinService) {}

  buildStreamUrl(jellyfinItemId: string, bitrate: number) {
    const api = this.jellyfinService.getApi();

    this.logger.debug(
      `Attempting to build stream resource for item ${jellyfinItemId} with bitrate ${bitrate}`,
    );

    const accessToken = this.jellyfinService.getApi().accessToken;

    const url = encodeURI(
      `${
        api.basePath
      }/Audio/${jellyfinItemId}/universal?UserId=${this.jellyfinService.getUserId()}&DeviceId=${
        this.jellyfinService.getJellyfin().clientInfo.name
      }&MaxStreamingBitrate=${bitrate}&Container=ogg,opus&AudioCodec=opus&TranscodingContainer=ts&TranscodingProtocol=hls&api_key=${accessToken}`,
    );

    return url;
  }
}
