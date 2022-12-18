import { Param } from '@discord-nestjs/core';

export class TrackRequestDto {
  @Param({ required: true, description: 'Track name to search' })
  search: string;
}
