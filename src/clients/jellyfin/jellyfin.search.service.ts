import { Injectable } from '@nestjs/common';
import { JellyfinService } from './jellyfin.service';

import {
  BaseItemKind,
  RemoteImageResult,
  SearchHint,
} from '@jellyfin/sdk/lib/generated-client/models';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { getPlaylistsApi } from '@jellyfin/sdk/lib/utils/api/playlists-api';
import { getRemoteImageApi } from '@jellyfin/sdk/lib/utils/api/remote-image-api';
import { getSearchApi } from '@jellyfin/sdk/lib/utils/api/search-api';
import { Logger } from '@nestjs/common/services';
import {
  JellyfinAudioPlaylist,
  JellyfinMusicAlbum,
} from '../../models/jellyfinAudioItems';

@Injectable()
export class JellyfinSearchService {
  private readonly logger = new Logger(JellyfinSearchService.name);

  constructor(private readonly jellyfinService: JellyfinService) {}

  async search(searchTerm: string): Promise<SearchHint[]> {
    const api = this.jellyfinService.getApi();

    this.logger.debug(`Searching for '${searchTerm}'`);

    const searchApi = getSearchApi(api);
    const {
      data: { SearchHints, TotalRecordCount },
      status,
    } = await searchApi.get({
      searchTerm: searchTerm,
      includeItemTypes: [
        BaseItemKind.Audio,
        BaseItemKind.MusicAlbum,
        BaseItemKind.Playlist,
      ],
    });

    if (status !== 200) {
      this.logger.error(`Jellyfin Search failed with status code ${status}`);
      return [];
    }

    this.logger.debug(`Found ${TotalRecordCount} results for '${searchTerm}'`);

    return SearchHints;
  }

  async getPlaylistById(id: string): Promise<JellyfinAudioPlaylist> {
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
      return new JellyfinAudioPlaylist();
    }

    return axiosResponse.data as JellyfinAudioPlaylist;
  }

  async getItemsByAlbum(albumId: string): Promise<JellyfinMusicAlbum> {
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
      return new JellyfinMusicAlbum();
    }

    return axiosResponse.data as JellyfinMusicAlbum;
  }

  async getById(id: string): Promise<SearchHint> {
    const api = this.jellyfinService.getApi();

    const searchApi = getItemsApi(api);
    const { data } = await searchApi.getItems({
      ids: [id],
    });

    if (data.Items.length !== 1) {
      this.logger.warn(`Failed to retrieve item via id '${id}'`);
      return null;
    }

    return data.Items[0];
  }

  async getRemoteImageById(id: string): Promise<RemoteImageResult> {
    const api = this.jellyfinService.getApi();
    const remoteImageApi = getRemoteImageApi(api);

    const axiosReponse = await remoteImageApi.getRemoteImages({
      itemId: id,
      includeAllLanguages: true,
      limit: 20,
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

    return axiosReponse.data;
  }
}
