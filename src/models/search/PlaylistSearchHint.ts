import { SearchHint as JellyfinSearchHint } from '@jellyfin/sdk/lib/generated-client/models';

import { Track } from '../shared/Track';
import { JellyfinSearchService } from '../../clients/jellyfin/jellyfin.search.service';

import { SearchHint } from './SearchHint';
import { convertToTracks } from 'src/utils/trackConverter';
import { trimStringToFixedLength } from 'src/utils/stringUtils/stringUtils';

export class PlaylistSearchHint extends SearchHint {
  override toString(): string {
    return `🎧 ${this.name}`;
  }

  static constructFromHint(hint: JellyfinSearchHint) {
    if (hint.Id === undefined || !hint.Name || !hint.RunTimeTicks) {
      throw new Error(
        'Unable to construct playlist search hint, required properties were undefined',
      );
    }

    return new PlaylistSearchHint(
      hint.Id,
      trimStringToFixedLength(hint.Name, 50),
      hint.RunTimeTicks / 10000,
    );
  }

  override async toTracks(
    searchService: JellyfinSearchService,
  ): Promise<Track[]> {
    const playlistItems = await searchService.getPlaylistitems(this.id);
    return convertToTracks(playlistItems, searchService);
  }
}
