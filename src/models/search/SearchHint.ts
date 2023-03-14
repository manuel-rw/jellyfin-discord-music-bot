import { SearchHint as JellyfinSearchHint } from '@jellyfin/sdk/lib/generated-client/models';

import { Track } from '../shared/Track';
import { JellyfinSearchService } from '../../clients/jellyfin/jellyfin.search.service';

export class SearchHint {
  constructor(
    protected readonly id: string,
    protected readonly name: string,
    protected runtimeInMilliseconds: number,
  ) {}

  toString() {
    return `🎵 ${this.name}`;
  }

  async toTracks(searchService: JellyfinSearchService): Promise<Track[]> {
    const remoteImages = await searchService.getRemoteImageById(this.id);
    return [
      new Track(this.id, this.name, this.runtimeInMilliseconds, remoteImages),
    ];
  }

  getId(): string {
    return this.id;
  }

  static constructFromHint(hint: JellyfinSearchHint) {
    return new SearchHint(hint.Id, hint.Name, hint.RunTimeTicks / 10000);
  }
}
