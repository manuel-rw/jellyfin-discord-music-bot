import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { CommandInteraction, Interaction } from 'discord.js';

@Injectable()
export class DeferReplyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const interaction = context.getArgByIndex(0) as Interaction | undefined;

    if (!interaction || !interaction.isCommand()) {
      return true;
    }

    const commandInteraction = interaction as CommandInteraction;

    // Check if the interaction has already been deferred or replied to
    if (commandInteraction.deferred || commandInteraction.replied) {
      return true;
    }

    // Defer the reply immediately to prevent the interaction token from expiring
    // This must happen before any async pipe processing
    try {
      await commandInteraction.deferReply();
    } catch (error) {
      // If deferReply fails (e.g., interaction already acknowledged), continue
      // This is a best-effort approach
    }

    return true;
  }
}
