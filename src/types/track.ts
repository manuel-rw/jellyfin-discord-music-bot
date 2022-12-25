import { RemoteImageResult } from '@jellyfin/sdk/lib/generated-client/models';

export interface Track {
  jellyfinId: string;
  name: string;
  durationInMilliseconds: number;
  streamUrl: string;
  remoteImages: RemoteImageResult;
}
