import { InteractionReplyOptions } from 'discord.js';

export interface GenericTryHandler {
  success: boolean;
  reply: GenericCustomReply;
}

export type GenericCustomReply =
  | string
  | InteractionReplyOptions
  | Promise<string | InteractionReplyOptions>;
