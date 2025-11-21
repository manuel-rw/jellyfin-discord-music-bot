import { Choice, Param, ParamType } from '@discord-nestjs/core';

export enum ActivityType {
  Playing = 0,
  Streaming = 1,
  Listening = 2,
  Watching = 3,
  Custom = 4,
  Competing = 5,
}

export enum ClientPresenceStatus {
  Online = 'online',
  Idle = 'idle',
  DoNotDisturb = 'dnd',
}

export class BotStatusDto {
  @Choice(ActivityType)
  @Param({
    name: 'activity',
    description: 'The activity to set',
    required: true,
    type: ParamType.INTEGER,
  })
  activity: ActivityType;

  @Choice(ClientPresenceStatus)
  @Param({
    name: 'status',
    description: 'The status to set',
    required: true,
  })
  status: ClientPresenceStatus;

  @Param({
    name: 'text',
    description: 'The text to set',
    required: true,
  })
  text: string;
}
