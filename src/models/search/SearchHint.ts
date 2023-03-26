import {
  BaseItemDto,
  SearchHint as JellyfinSearchHint,
} from '@jellyfin/sdk/lib/generated-client/models';

import { JellyfinSearchService } from '../../clients/jellyfin/jellyfin.search.service';
import { Track } from '../shared/Track';

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
    return [new Track(this.id, this.name, this.runtimeInMilliseconds, {})];
  }

  getId(): string {
    return this.id;
  }

  static constructFromHint(hint: JellyfinSearchHint) {
    return new SearchHint(hint.Id, hint.Name, hint.RunTimeTicks / 10000);
  }

  static constructFromBaseItem(baseItem: BaseItemDto) {
    return new SearchHint(
      baseItem.Id,
      baseItem.Name,
      baseItem.RunTimeTicks / 10000,
    );
  }
}
