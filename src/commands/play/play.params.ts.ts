import { Choice, Param, ParamType } from '@discord-nestjs/core';

import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';

export enum SearchType {
  Audio = 0,
  AudioAlbum = 1,
  Playlist = 2,
}

export class PlayCommandParams {
  @Param({
    required: true,
    description: 'Item name on Jellyfin',
    autocomplete: true,
  })
  name: string;

  @Choice(SearchType)
  @Param({ description: 'Desired item type', type: ParamType.INTEGER })
  type: SearchType | undefined;

  static getBaseItemKinds(type: SearchType | undefined) {
    switch (type) {
      case SearchType.Audio:
        return [BaseItemKind.Audio];
      case SearchType.Playlist:
        return [BaseItemKind.Playlist];
      case SearchType.AudioAlbum:
        return [BaseItemKind.MusicAlbum];
      default:
        return [
          BaseItemKind.Audio,
          BaseItemKind.Playlist,
          BaseItemKind.MusicAlbum,
        ];
    }
  }
}
