import { InteractionReplyOptions } from 'discord.js';

export interface GenericTryHandler {
  success: boolean;
  reply:
    | string
    | InteractionReplyOptions
    | Promise<string | InteractionReplyOptions>;
}
