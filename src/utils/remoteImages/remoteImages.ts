import {
  ImageType,
  RemoteImageInfo,
  RemoteImageResult,
} from '@jellyfin/sdk/lib/generated-client/models';
import { Track } from '../../types/track';

export const chooseSuitableRemoteImage = (
  remoteImageResult: RemoteImageResult,
): RemoteImageInfo | undefined => {
  const primaryImages: RemoteImageInfo[] | undefined =
    remoteImageResult.Images.filter((x) => x.Type === ImageType.Primary);

  if (primaryImages.length > 0) {
    return primaryImages[0];
  }

  if (remoteImageResult.Images.length > 0) {
    return remoteImageResult.Images[0];
  }
};

export const chooseSuitableRemoteImageFromTrack = (track: Track) => {
  return chooseSuitableRemoteImage(track.remoteImages);
};
