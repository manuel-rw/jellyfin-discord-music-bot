import { Injectable } from '@nestjs/common';
import { JellyfinService } from './jellyfin.service';

import { SearchHint } from '@jellyfin/sdk/lib/generated-client/models';
import { getSearchApi } from '@jellyfin/sdk/lib/utils/api/search-api';
import { Logger } from '@nestjs/common/services';

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
    } = await searchApi.get({
      searchTerm: searchTerm,
      mediaTypes: ['Audio', 'Album'],
    });

    this.logger.debug(`Found ${TotalRecordCount} results for '${searchTerm}'`);

    return SearchHints;
  }
}
