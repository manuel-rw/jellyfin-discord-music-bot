import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Interaction } from 'discord.js';
import { getEnvironmentVariables } from '../../../utils/environment';

@Injectable()
export class ChannelLockGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const lockedChannelIds = getEnvironmentVariables().LOCKED_CHANNEL_IDS;

    if (lockedChannelIds.length === 0) {
      return true;
    }

    const interaction = context.getArgByIndex(0) as Interaction | undefined;

    if (!interaction || !interaction.channelId) {
      return true;
    }

    return lockedChannelIds.includes(interaction.channelId);
  }
}
