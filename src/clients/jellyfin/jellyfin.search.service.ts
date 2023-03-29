import {
  BaseItemDto,
  BaseItemKind,
  RemoteImageResult,
  SearchHint as JellyfinSearchHint,
} from '@jellyfin/sdk/lib/generated-client/models';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { getPlaylistsApi } from '@jellyfin/sdk/lib/utils/api/playlists-api';
import { getRemoteImageApi } from '@jellyfin/sdk/lib/utils/api/remote-image-api';
import { getSearchApi } from '@jellyfin/sdk/lib/utils/api/search-api';

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common/services';

import { AlbumSearchHint } from '../../models/search/AlbumSearchHint';
import { PlaylistSearchHint } from '../../models/search/PlaylistSearchHint';
import { SearchHint } from '../../models/search/SearchHint';

import { JellyfinService } from './jellyfin.service';

@Injectable()
export class JellyfinSearchService {
  private readonly logger = new Logger(JellyfinSearchService.name);

  constructor(private readonly jellyfinService: JellyfinService) {}

  async searchItem(
    searchTerm: string,
    limit?: number,
    includeItemTypes: BaseItemKind[] = [
      BaseItemKind.Audio,
      BaseItemKind.MusicAlbum,
      BaseItemKind.Playlist,
    ],
  ): Promise<SearchHint[]> {
    const api = this.jellyfinService.getApi();
    const searchApi = getSearchApi(api);

    if (includeItemTypes.length === 0) {
      this.logger.warn(
        `Included item types are empty. This may lead to unwanted results`,
      );
    }

    try {
      const { data, status } = await searchApi.get({
        searchTerm: searchTerm,
        includeItemTypes: includeItemTypes,
        limit: limit,
      });

      if (status !== 200) {
        this.logger.error(
          `Jellyfin Search failed with status code ${status}: ${data}`,
        );
        return [];
      }

      const { SearchHints } = data;

      if (!SearchHints) {
        throw new Error('SearchHints were undefined');
      }

      return SearchHints.map((hint) =>
        this.transformToSearchHintFromHint(hint),
      ).filter((x) => x !== null) as SearchHint[];
    } catch (err) {
      this.logger.error(`Failed to search on Jellyfin: ${err}`);
      return [];
    }
  }

  async getPlaylistitems(id: string): Promise<SearchHint[]> {
    const api = this.jellyfinService.getApi();
    const searchApi = getPlaylistsApi(api);

    const axiosResponse = await searchApi.getPlaylistItems({
      userId: this.jellyfinService.getUserId(),
      playlistId: id,
    });

    if (axiosResponse.status !== 200) {
      this.logger.error(
        `Jellyfin Search failed with status code ${axiosResponse.status}`,
      );
      return [];
    }

    if (!axiosResponse.data.Items) {
      this.logger.error(
        `Jellyfin search returned no items: ${axiosResponse.data}`,
      );
      return [];
    }

    return axiosResponse.data.Items.map((hint) =>
      SearchHint.constructFromBaseItem(hint),
    );
  }

  async getAlbumItems(albumId: string): Promise<SearchHint[]> {
    const api = this.jellyfinService.getApi();
    const searchApi = getSearchApi(api);
    const axiosResponse = await searchApi.get({
      parentId: albumId,
      userId: this.jellyfinService.getUserId(),
      mediaTypes: [BaseItemKind[BaseItemKind.Audio]],
      searchTerm: '%',
    });

    if (axiosResponse.status !== 200) {
      this.logger.error(
        `Jellyfin Search failed with status code ${axiosResponse.status}`,
      );
      return [];
    }

    if (!axiosResponse.data.SearchHints) {
      this.logger.error(
        `Received an unexpected empty list but expected a list of tracks of the album`,
      );
      return [];
    }

    return [...axiosResponse.data.SearchHints]
      .reverse()
      .map((hint) => SearchHint.constructFromHint(hint));
  }

  async getById(
    id: string,
    includeItemTypes: BaseItemKind[],
  ): Promise<SearchHint | undefined> {
    const api = this.jellyfinService.getApi();

    const searchApi = getItemsApi(api);
    const { data } = await searchApi.getItems({
      ids: [id],
      userId: this.jellyfinService.getUserId(),
      includeItemTypes: includeItemTypes,
    });

    if (!data.Items || data.Items.length !== 1) {
      this.logger.warn(`Failed to retrieve item via id '${id}'`);
      return undefined;
    }

    return this.transformToSearchHintFromBaseItemDto(data.Items[0]);
  }

  async getAllById(
    ids: string[],
    includeItemTypes: BaseItemKind[] = [BaseItemKind.Audio],
  ): Promise<SearchHint[]> {
    const api = this.jellyfinService.getApi();

    const searchApi = getItemsApi(api);
    const { data } = await searchApi.getItems({
      ids: ids,
      userId: this.jellyfinService.getUserId(),
      includeItemTypes: includeItemTypes,
    });

    if (!data.Items || data.Items.length !== 1) {
      this.logger.warn(`Failed to retrieve item via id '${ids}'`);
      return [];
    }

    return data.Items.map((item) =>
      this.transformToSearchHintFromBaseItemDto(item),
    ).filter((searchHint) => searchHint !== undefined) as SearchHint[];
  }

  async getRemoteImageById(id: string, limit = 20): Promise<RemoteImageResult> {
    const api = this.jellyfinService.getApi();
    const remoteImageApi = getRemoteImageApi(api);

    this.logger.verbose(
      `Searching for remote images of item '${id}' with limit of ${limit}`,
    );

    try {
      const axiosReponse = await remoteImageApi.getRemoteImages({
        itemId: id,
        includeAllLanguages: true,
        limit: limit,
      });

      if (axiosReponse.status !== 200) {
        this.logger.warn(
          `Failed to retrieve remote images. Response has status ${axiosReponse.status}`,
        );
        return {
          Images: [],
          Providers: [],
          TotalRecordCount: 0,
        };
      }

      this.logger.verbose(
        `Retrieved ${axiosReponse.data.TotalRecordCount} remote images from Jellyfin`,
      );
      return axiosReponse.data;
    } catch (err) {
      this.logger.error(`Failed to retrieve remote images: ${err}`);
      return {
        Images: [],
        Providers: [],
        TotalRecordCount: 0,
      };
    }
  }

  async getRandomTracks(limit: number) {
    const api = this.jellyfinService.getApi();
    const searchApi = getItemsApi(api);

    try {
      const response = await searchApi.getItems({
        includeItemTypes: [BaseItemKind.Audio],
        limit: limit,
        sortBy: ['random'],
        userId: this.jellyfinService.getUserId(),
        recursive: true,
      });

      if (!response.data.Items) {
        this.logger.error(
          `Received empty list of items but expected a random list of tracks`,
        );
        return [];
      }

      return response.data.Items.map((item) => {
        return SearchHint.constructFromBaseItem(item);
      });
    } catch (err) {
      this.logger.error(
        `Unable to retrieve random items from Jellyfin: ${err}`,
      );
      return [];
    }
  }

  private transformToSearchHintFromHint(jellyifnHint: JellyfinSearchHint) {
    switch (jellyifnHint.Type) {
      case BaseItemKind[BaseItemKind.Audio]:
        return SearchHint.constructFromHint(jellyifnHint);
      case BaseItemKind[BaseItemKind.MusicAlbum]:
        return AlbumSearchHint.constructFromHint(jellyifnHint);
      case BaseItemKind[BaseItemKind.Playlist]:
        return PlaylistSearchHint.constructFromHint(jellyifnHint);
      default:
        this.logger.warn(
          `Received unexpected item type from Jellyfin search: ${jellyifnHint.Type}`,
        );
        return undefined;
    }
  }

  private transformToSearchHintFromBaseItemDto(baseItemDto: BaseItemDto) {
    switch (baseItemDto.Type) {
      case BaseItemKind[BaseItemKind.Audio]:
        return SearchHint.constructFromBaseItem(baseItemDto);
      case BaseItemKind[BaseItemKind.MusicAlbum]:
        return AlbumSearchHint.constructFromBaseItem(baseItemDto);
      case BaseItemKind[BaseItemKind.Playlist]:
        return PlaylistSearchHint.constructFromBaseItem(baseItemDto);
      default:
        this.logger.warn(
          `Received unexpected item type from Jellyfin search: ${baseItemDto.Type}`,
        );
        return undefined;
    }
  }
}
