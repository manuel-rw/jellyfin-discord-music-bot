import {
  RemoteImageInfo,
  RemoteImageResult,
} from '@jellyfin/sdk/lib/generated-client/models';

import { JellyfinStreamBuilderService } from '../clients/jellyfin/jellyfin.stream.builder.service';

export class Track {
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
  remoteImages?: RemoteImageResult;
  readonly normalizationGain?: number;

  playing: boolean;

  playbackProgress: number;

  constructor(
    id: string,
    name: string,
    duration: number,
    remoteImages?: RemoteImageResult,
    normalizationGain?: number,
  ) {
    this.id = id;
    this.name = name;
    this.duration = duration;
    this.remoteImages = remoteImages;
    this.normalizationGain = normalizationGain;
    this.playing = false;
    this.playbackProgress = 0;
  }

  getDuration() {
    return this.duration;
  }

  getStreamUrl(streamBuilder: JellyfinStreamBuilderService) {
    return streamBuilder.buildStreamUrl(this.id, 96000);
  }

  getRemoteImages(): RemoteImageInfo[] {
    return this.remoteImages?.Images ?? [];
  }

  getPlaybackProgress() {
    return this.playbackProgress;
  }

  updatePlaybackProgress(progress: number) {
    this.playbackProgress = progress;
  }
}
