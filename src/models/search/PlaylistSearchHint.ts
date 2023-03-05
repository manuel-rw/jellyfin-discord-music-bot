import { SearchHint as JellyfinSearchHint } from '@jellyfin/sdk/lib/generated-client/models';

import { GenericTrack } from '../shared/GenericTrack';
import { JellyfinSearchService } from '../../clients/jellyfin/jellyfin.search.service';

import { SearchHint } from './SearchHint';

export class PlaylistSearchHint extends SearchHint {
  override toString(): string {
    return `🎧 ${this.name}`;
  }

  static constructFromHint(hint: JellyfinSearchHint) {
    return new PlaylistSearchHint(
      hint.Id,
      hint.Name,
      hint.RunTimeTicks / 10000,
    );
  }

  override async toTracks(
    searchService: JellyfinSearchService,
  ): Promise<GenericTrack[]> {
    const playlistItems = await searchService.getPlaylistitems(this.id);
    const tracks = playlistItems.map(async (x) =>
      (await x.toTracks(searchService)).find((x) => x !== null),
    );
    return await Promise.all(tracks);
  }
}
