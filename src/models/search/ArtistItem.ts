import { SearchItem } from './SearchItem';
import { JellyfinSearchService } from '../../clients/jellyfin/jellyfin.search.service';
import { Track } from '../music/Track';
import { flatMapTrackItems } from '../../utils/trackConverter';
import { SearchHint as JellyfinSearchHint } from '@jellyfin/sdk/lib/generated-client/models/search-hint';
import { trimStringToFixedLength } from '../../utils/stringUtils/stringUtils';
import { z } from 'zod';
import { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';

const schema = z.object({
  Id: z.string(),
  Name: z.string(),
  RunTimeTicks: z.number(),
});

export class ArtistItem extends SearchItem {
  override toString(): string {
    return `👤${this.name}`;
  }

  override async toTracks(
    searchService: JellyfinSearchService,
  ): Promise<Track[]> {
    const tracks = await searchService.findArtist(this.id);
    return flatMapTrackItems(tracks, searchService);
  }

  static constructFromHint(hint: JellyfinSearchHint) {
    const arist = schema.parse(hint);

    return new ArtistItem(
      arist.Id,
      trimStringToFixedLength(arist.Name, 50),
      arist.RunTimeTicks / 10000,
    );
  }

  static constructFromBaseItem(baseItem: BaseItemDto) {
    const arist = schema.parse(baseItem);

    return new ArtistItem(
      arist.Id,
      trimStringToFixedLength(arist.Name, 50),
      arist.RunTimeTicks / 10000,
    );
  }
}
