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

    const uri = new URL(api.basePath);
    uri.pathname = `/Audio/${jellyfinItemId}/universal`;
    uri.searchParams.set('UserId', this.jellyfinService.getUserId());
    uri.searchParams.set(
      'DeviceId',
      this.jellyfinService.getJellyfin().clientInfo.name,
    );
    uri.searchParams.set('MaxStreamingBitrate', `${bitrate}`);
    uri.searchParams.set('Container', 'ogg,opus');
    uri.searchParams.set('AudioCodec', 'opus');
    uri.searchParams.set('TranscodingContainer', 'ts');
    uri.searchParams.set('TranscodingProtocol', 'hls');
    uri.searchParams.set('api_key', accessToken);

    return uri.toString();
  }
}
