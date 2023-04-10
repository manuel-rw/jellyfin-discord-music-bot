import { Param, ParamType } from '@discord-nestjs/core';

export class RandomCommandParams {
  @Param({
    required: false,
    description: 'Count of items to search for',
    type: ParamType.INTEGER,
    minValue: 0,
    maxValue: 10000,
  })
  count = 20;
}
