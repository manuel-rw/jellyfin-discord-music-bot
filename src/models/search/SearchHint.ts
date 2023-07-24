import {
  BaseItemDto,
  SearchHint as JellyfinSearchHint,
} from '@jellyfin/sdk/lib/generated-client/models';
import { z } from 'zod';

import { JellyfinSearchService } from '../../clients/jellyfin/jellyfin.search.service';
import { Track } from '../shared/Track';
import { trimStringToFixedLength } from 'src/utils/stringUtils/stringUtils';

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
    const schema = z.object({
      Id: z.string(),
      Name: z.string(),
      RunTimeTicks: z.number(),
    });

    const result = schema.safeParse(hint);

    if (!result.success) {
      throw new Error(
        `Unable to construct search hint, required properties were undefined: ${JSON.stringify(
          hint,
        )}`,
      );
    }

    return new SearchHint(
      result.data.Id,
      trimStringToFixedLength(result.data.Name, 50),
      result.data.RunTimeTicks / 10000,
    );
  }

  static constructFromBaseItem(baseItem: BaseItemDto) {
    if (baseItem.Id === undefined || !baseItem.Name || !baseItem.RunTimeTicks) {
      throw new Error(
        'Unable to construct search hint from base item, required properties were undefined',
      );
    }
    return new SearchHint(
      baseItem.Id,
      trimStringToFixedLength(baseItem.Name, 50),
      baseItem.RunTimeTicks / 10000,
    );
  }
}
