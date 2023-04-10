import { Param, ParamType } from '@discord-nestjs/core';

export class VolumeCommandParams {
  @Param({
    required: true,
    description: 'The desired volume',
    type: ParamType.INTEGER,
    minValue: 0,
    maxValue: 150,
  })
  volume: number;
}
