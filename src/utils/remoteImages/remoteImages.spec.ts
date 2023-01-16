import { ImageType } from '@jellyfin/sdk/lib/generated-client/models';
import { chooseSuitableRemoteImageFromTrack } from './remoteImages';

describe('remoteImages', () => {
  it('chooseSuitableRemoteImageFromTrack', () => {
    const remoteImage = chooseSuitableRemoteImageFromTrack({
      name: 'Testing Music',
      durationInMilliseconds: 6969,
      jellyfinId: '7384783',
      remoteImages: {
        Images: [
          {
            Type: ImageType.Primary,
            Url: 'nice picture.png',
          },
          {
            Type: ImageType.Screenshot,
            Url: 'not nice picture',
          },
        ],
      },
      streamUrl: 'http://jellyfin/example-stream',
    });

    expect(remoteImage).not.toBeNull();
    expect(remoteImage.Type).toBe(ImageType.Primary);
    expect(remoteImage.Url).toBe('nice picture.png');
  });
});
