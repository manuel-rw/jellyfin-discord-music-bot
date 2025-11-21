import { Param, ParamType } from '@discord-nestjs/core';

export class PlaylistCommandParams {
  @Param({
    required: false,
    description: 'The page',
    type: ParamType.INTEGER,
  })
  page: number;
}
