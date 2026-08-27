import {
  BaseItemDto,
  SearchHint as JellyfinSearchHint,
} from '@jellyfin/sdk/lib/generated-client/models';
import { z } from 'zod';

import { JellyfinSearchService } from './jellyfin.search.service';
import { Track } from '../../../models/track';
import { trimStringToFixedLength } from '../../../utils/stringUtils/stringUtils';

export class SearchItem {
  constructor(
    protected readonly id: string,
    protected readonly name: string,
    protected runtimeInMilliseconds: number,
    protected readonly artist?: string,
    protected readonly album?: string,
  ) {}

  toString() {
    return `🎵 ${this.name}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  toTracks(searchService: JellyfinSearchService): Promise<Track[]> {
    return Promise.resolve([
      new Track(
        this.id,
        this.name,
        this.runtimeInMilliseconds,
        {},
        this.artist,
        this.album,
      ),
    ]);
  }

  getId(): string {
    return this.id;
  }

  static constructFromHint(hint: JellyfinSearchHint) {
    const schema = z.object({
      Id: z.string(),
      Artists: z.array(z.string()).optional(),
      Album: z.string().optional(),
      AlbumArtist: z.string().optional(),
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

    const artist =
      result.data.Artists?.[0] ??
      result.data.AlbumArtist?.split('/')[0]?.trim() ??
      '';
    const album = result.data.Album ?? '';

    let displayName = result.data.Name;
    if (artist) {
      displayName = `${artist} - ${displayName}`;
    }

    return new SearchItem(
      result.data.Id,
      trimStringToFixedLength(displayName, 70),
      result.data.RunTimeTicks / 10000,
      artist || undefined,
      album || undefined,
    );
  }

  static constructFromBaseItem(baseItem: BaseItemDto) {
    if (baseItem.Id === undefined || !baseItem.Name || !baseItem.RunTimeTicks) {
      throw new Error(
        'Unable to construct search hint from base item, required properties were undefined',
      );
    }
    const artist =
      baseItem.AlbumArtist?.split('/')[0]?.trim() ??
      baseItem.Artists?.[0] ??
      '';
    const album = baseItem.Album ?? '';
    const displayName = artist ? `${artist} - ${baseItem.Name}` : baseItem.Name;

    return new SearchItem(
      baseItem.Id,
      trimStringToFixedLength(displayName, 50),
      baseItem.RunTimeTicks / 10000,
      artist || undefined,
      album || undefined,
    );
  }
}
