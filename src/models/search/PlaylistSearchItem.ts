import {
  BaseItemDto,
  SearchHint as JellyfinSearchHint,
} from '@jellyfin/sdk/lib/generated-client/models';

import { Track } from '../music/Track';
import { JellyfinSearchService } from '../../clients/jellyfin/jellyfin.search.service';

import { SearchItem } from './SearchItem';
import { flatMapTrackItems } from '../../utils/trackConverter';
import { trimStringToFixedLength } from '../../utils/stringUtils/stringUtils';

export class PlaylistSearchItem extends SearchItem {
  override toString(): string {
    return `🎧 ${this.name}`;
  }

  static constructFromHint(hint: JellyfinSearchHint) {
    if (hint.Id === undefined || !hint.Name || !hint.RunTimeTicks) {
      throw new Error(
        'Unable to construct playlist search hint, required properties were undefined',
      );
    }

    return new PlaylistSearchItem(
      hint.Id,
      trimStringToFixedLength(hint.Name, 50),
      hint.RunTimeTicks / 10000,
    );
  }

  static constructFromBaseItem(baseItem: BaseItemDto) {
    if (baseItem.Id === undefined || !baseItem.Name || !baseItem.RunTimeTicks) {
      throw new Error(
        'Unable to construct playlist search hint, required properties were undefined',
      );
    }

    return new PlaylistSearchItem(
      baseItem.Id,
      trimStringToFixedLength(baseItem.Name, 50),
      baseItem.RunTimeTicks / 10000,
    );
  }

  override async toTracks(
    searchService: JellyfinSearchService,
  ): Promise<Track[]> {
    const playlistItems = await searchService.getPlaylistitems(this.id);
    return flatMapTrackItems(playlistItems, searchService);
  }
}
