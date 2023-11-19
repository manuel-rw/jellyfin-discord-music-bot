import { SearchHint as JellyfinSearchHint } from '@jellyfin/sdk/lib/generated-client/models';

import { Track } from '../music/Track';
import { JellyfinSearchService } from '../../clients/jellyfin/jellyfin.search.service';

import { SearchItem } from './SearchItem';
import { trimStringToFixedLength } from '../../utils/stringUtils/stringUtils';

export class AlbumSearchItem extends SearchItem {
  override toString(): string {
    return `🎶 ${this.name}`;
  }

  static constructFromHint(hint: JellyfinSearchHint) {
    if (hint.Id === undefined || !hint.Name || !hint.RunTimeTicks) {
      throw new Error(
        'Unable to construct playlist search hint, required properties were undefined',
      );
    }
    var artist = ""
    if(hint.AlbumArtist) {
    	artist = hint.AlbumArtist + " - "
    }

    return new AlbumSearchItem(
      hint.Id,
      trimStringToFixedLength(artist + hint.Name, 70),
      hint.RunTimeTicks / 10000,
    );
  }

  override async toTracks(
    searchService: JellyfinSearchService,
  ): Promise<Track[]> {
    const remoteImages = await searchService.getRemoteImageById(this.id);
    const albumItems = await searchService.getAlbumItems(this.id);
    const tracks = await Promise.all(
      albumItems.map(async (x) =>
        (await x.toTracks(searchService)).find((x) => x !== null),
      ),
    );
    return tracks.map((track: Track): Track => {
      track.remoteImages = remoteImages;
      return track;
    });
  }
}
