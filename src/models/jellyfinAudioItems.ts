import {
  BaseItemKind,
  SearchHint,
} from '@jellyfin/sdk/lib/generated-client/models';
import { JellyfinStreamBuilderService } from '../clients/jellyfin/jellyfin.stream.builder.service';
import { Track } from '../types/track';
import { trimStringToFixedLength } from '../utils/stringUtils';

import { Logger } from '@nestjs/common';
import { JellyfinSearchService } from '../clients/jellyfin/jellyfin.search.service';

export interface BaseJellyfinAudioPlayable {
  /**
   * The primary identifier of the item
   */
  Id: string;

  /**
   * The name of the item
   */
  Name: string;

  /**
   * The runtime in ticks. 10'000 ticks equal one second
   */
  RunTimeTicks: number;

  fromSearchHint(
    jellyfinSearchService: JellyfinSearchService,
    searchHint: SearchHint,
  ): Promise<BaseJellyfinAudioPlayable>;

  fetchTracks(
    jellyfinStreamBuilder: JellyfinStreamBuilderService,
    bitrate: number,
  ): Track[];

  prettyPrint(search: string): string;

  getId(): string;

  getValueId(): string;

  getEmoji(): string;
}

export class JellyfinAudioItem implements BaseJellyfinAudioPlayable {
  Id: string;
  Name: string;
  RunTimeTicks: number;
  ItemId: string;

  /**
   * The year, when this was produced. Usually something like 2021
   */
  ProductionYear?: number;

  Album?: string;

  AlbumId?: string;

  AlbumArtist?: string;

  Artists?: string[];

  getValueId(): string {
    return `track_${this.getId()}`;
  }
  async fromSearchHint(
    jellyfinSearchService: JellyfinSearchService,
    searchHint: SearchHint,
  ): Promise<BaseJellyfinAudioPlayable> {
    this.Id = searchHint.Id;
    this.ItemId = searchHint.ItemId;
    this.Name = searchHint.Name;
    this.RunTimeTicks = searchHint.RunTimeTicks;
    this.Album = searchHint.Album;
    this.AlbumArtist = searchHint.AlbumArtist;
    this.AlbumId = searchHint.AlbumId;
    this.Artists = searchHint.Artists;
    return this;
  }

  getEmoji(): string {
    return '🎵';
  }

  getId(): string {
    return this.Id;
  }

  prettyPrint(search: string): string {
    let line = trimStringToFixedLength(
      markSearchTermOverlap(this.Name, search),
      30,
    );
    if (this.Artists !== undefined && this.Artists.length > 0) {
      line += ` [${this.Artists.join(', ')}]`;
    }
    line += ` *(Audio)*`;
    return line;
  }

  fetchTracks(
    jellyfinStreamBuilder: JellyfinStreamBuilderService,
    bitrate: number,
  ): Track[] {
    return [
      {
        name: this.Name,
        durationInMilliseconds: this.RunTimeTicks / 1000,
        jellyfinId: this.Id,
        streamUrl: jellyfinStreamBuilder.buildStreamUrl(this.Id, bitrate),
      },
    ];
  }
}

export class JellyfinAudioPlaylist implements BaseJellyfinAudioPlayable {
  getValueId(): string {
    return `playlist_${this.getId()}`;
  }
  async fromSearchHint(
    jellyfinSearchService: JellyfinSearchService,
    searchHint: SearchHint,
  ): Promise<BaseJellyfinAudioPlayable> {
    this.Id = searchHint.Id;
    this.Name = searchHint.Name;
    this.RunTimeTicks = searchHint.RunTimeTicks;
    const playlist = await jellyfinSearchService.getPlaylistById(searchHint.Id);
    this.Items = playlist.Items;
    this.TotalRecordCount = playlist.TotalRecordCount;
    return this;
  }

  getEmoji(): string {
    return '📚';
  }

  getId(): string {
    return this.Id;
  }

  prettyPrint(search: string): string {
    return `${markSearchTermOverlap(this.Name, search)} (${
      this.TotalRecordCount
    } items) (Playlist)`;
  }

  fetchTracks(
    jellyfinStreamBuilder: JellyfinStreamBuilderService,
    bitrate: number,
  ): Track[] {
    return this.Items.flatMap((item) =>
      item.fetchTracks(jellyfinStreamBuilder, bitrate),
    );
  }

  Id: string;
  Name: string;
  RunTimeTicks: number;
  Items: JellyfinAudioItem[];
  TotalRecordCount: number;
}

export class JellyfinMusicAlbum implements BaseJellyfinAudioPlayable {
  Id: string;
  Name: string;
  RunTimeTicks: number;
  SearchHints: JellyfinAudioItem[];
  TotalRecordCount: number;

  async fromSearchHint(
    jellyfinSearchService: JellyfinSearchService,
    searchHint: SearchHint,
  ): Promise<JellyfinMusicAlbum> {
    this.Id = searchHint.Id;
    this.Name = searchHint.Name;
    this.RunTimeTicks = searchHint.RunTimeTicks;
    const album = await jellyfinSearchService.getItemsByAlbum(searchHint.Id);
    this.SearchHints = album.SearchHints;
    this.TotalRecordCount = album.TotalRecordCount;
    return this;
  }
  fetchTracks(
    jellyfinStreamBuilder: JellyfinStreamBuilderService,
    bitrate: number,
  ): Track[] {
    return this.SearchHints.flatMap((item) =>
      item.fetchTracks(jellyfinStreamBuilder, bitrate),
    );
  }
  prettyPrint(search: string): string {
    return `${markSearchTermOverlap(this.Name, search)} (${
      this.TotalRecordCount
    } items) (Album)`;
  }
  getId(): string {
    return this.Id;
  }
  getValueId(): string {
    return `album_${this.getId()}`;
  }
  getEmoji(): string {
    return '📀';
  }
}

export const searchResultAsJellyfinAudio = async (
  logger: Logger,
  jellyfinSearchService: JellyfinSearchService,
  searchHint: SearchHint,
) => {
  switch (searchHint.Type) {
    case BaseItemKind[BaseItemKind.Audio]:
      return await new JellyfinAudioItem().fromSearchHint(
        jellyfinSearchService,
        searchHint,
      );
    case BaseItemKind[BaseItemKind.Playlist]:
      return await new JellyfinAudioPlaylist().fromSearchHint(
        jellyfinSearchService,
        searchHint,
      );
    case BaseItemKind[BaseItemKind.MusicAlbum]:
      return await new JellyfinMusicAlbum().fromSearchHint(
        jellyfinSearchService,
        searchHint,
      );
    default:
      logger.error(
        `Failed to parse Jellyfin response for item type ${searchHint.Type}`,
      );
      null;
  }
};

export const markSearchTermOverlap = (value: string, searchTerm: string) => {
  const startIndex = value.indexOf(searchTerm);
  const actualValue = value.substring(
    startIndex,
    startIndex + 1 + searchTerm.length,
  );
  return `${value.substring(0, startIndex)}**${actualValue}**${value.substring(
    startIndex + 1 + actualValue.length,
  )}`;
};
