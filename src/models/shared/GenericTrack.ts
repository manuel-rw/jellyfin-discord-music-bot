import { RemoteImageInfo, RemoteImageResult } from '@jellyfin/sdk/lib/generated-client/models';

import { JellyfinStreamBuilderService } from '../../clients/jellyfin/jellyfin.stream.builder.service';

export class GenericTrack {
  /**
   * The identifier of this track, structured as a UID.
   * This id can be used to build a stream url and send more API requests to Jellyfin
   */
  readonly id: string;

  /**
   * The name of the track
   */
  readonly name: string;

  /**
   * The duration of the track
   */
  readonly duration: number;

  /**
   * A result object that contains a collection of images that are available outside the current network.
   */
  readonly remoteImages?: RemoteImageResult;

  constructor(
    id: string,
    name: string,
    duration: number,
    remoteImages?: RemoteImageResult,
  ) {
    this.id = id;
    this.name = name;
    this.duration = duration;
    this.remoteImages = remoteImages;
  }

  getDuration() {
    return this.duration;
  }

  getStreamUrl(streamBuilder: JellyfinStreamBuilderService) {
    return streamBuilder.buildStreamUrl(this.id, 96000);
  }

  getRemoteImage(): RemoteImageInfo | undefined {
    return this.remoteImages.Images.find((x) => true);
  }
}
