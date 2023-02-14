import { RemoteImageResult } from '@jellyfin/sdk/lib/generated-client/models';

export class GenericTrack {
  /**
   * The identifier of this track, structured as a UID.
   * This id can be used to build a stream url and send more API requests to Jellyfin
   */
  id: string;

  /**
   * The name of the track
   */
  name: string;

  /**
   * The duration of the track
   */
  duration: number;

  /**
   * A result object that contains a collection of images that are available outside the current network.
   */
  remoteImages?: RemoteImageResult;

  constructor(name: string, duration: number) {
    this.name = name;
    this.duration = duration;
  }

  getDuration() {
    return this.duration;
  }

  getStreamUrl(bitrate: number) {
    // TODO: Create the stream url using the bitrate
    return '';
  }

  static constructFromA(): GenericTrack {
    return new GenericTrack('wd', 0);
  }
}
