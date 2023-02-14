import { InteractionEditReplyOptions, MessagePayload } from 'discord.js';

export interface GenericTryHandler {
  success: boolean;
  reply: string | MessagePayload | InteractionEditReplyOptions;
}
