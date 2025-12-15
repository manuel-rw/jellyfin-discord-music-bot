import { SearchItem } from './search.item';
import { JellyfinSearchService } from './jellyfin.search.service';
import { Track } from '../../../models/track';
import { flatMapTrackItems } from '../../../utils/trackConverter';
import { SearchHint as JellyfinSearchHint } from '@jellyfin/sdk/lib/generated-client/models/search-hint';
import { trimStringToFixedLength } from '../../../utils/stringUtils/stringUtils';
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
    return this.constructArtist(hint);
  }

  static constructFromBaseItem(baseItem: BaseItemDto) {
    return this.constructArtist(baseItem);
  }

  private static constructArtist(data: BaseItemDto | JellyfinSearchHint) {
    const artist = schema.parse(data);

    return new ArtistItem(
      artist.Id,
      trimStringToFixedLength(artist.Name, 50),
      artist.RunTimeTicks / 10000,
    );
  }
}
