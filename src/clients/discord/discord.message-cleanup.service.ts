import { InjectDiscordClient } from '@discord-nestjs/core';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  Client,
  CommandInteraction,
  InteractionCallbackResponse,
  InteractionResponse,
  Message,
} from 'discord.js';
import { getEnvironmentVariables } from '../../utils/environment';

@Injectable()
export class DiscordMessageCleanupService implements OnModuleDestroy {
  private readonly logger = new Logger(DiscordMessageCleanupService.name);
  private readonly pendingDeletions = new Set<NodeJS.Timeout>();

  constructor(@InjectDiscordClient() private readonly client: Client) {}

  onModuleDestroy() {
    for (const timer of this.pendingDeletions) {
      clearTimeout(timer);
    }
    this.pendingDeletions.clear();
  }

  /**
   * Schedules the deletion of a message after a configurable amount of seconds.
   * The delay is taken from the AUTO_DELETE_BOT_MESSAGES_SECONDS environment
   * variable unless a timeout is passed in explicitly. A value of 0 or lower
   * (or a missing value) disables the cleanup entirely.
   */
  scheduleDeletion(
    channelId: string,
    messageId: string,
    timeoutSeconds?: number,
  ): void {
    const delayInSeconds =
      timeoutSeconds ??
      getEnvironmentVariables().AUTO_DELETE_BOT_MESSAGES_SECONDS;

    if (!Number.isFinite(delayInSeconds) || delayInSeconds <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      this.pendingDeletions.delete(timer);
      this.deleteMessage(channelId, messageId).catch(() => undefined);
    }, delayInSeconds * 1000);

    this.pendingDeletions.add(timer);
  }

  /**
   * Schedules the cleanup of a response that was created by a command
   * interaction (e.g. the result of `reply`, `editReply` or `followUp`).
   */
  async scheduleResponseDeletion(
    response: InteractionResponse | InteractionCallbackResponse | Message,
    timeoutSeconds?: number,
  ): Promise<void> {
    let message: Message | undefined;

    if (response instanceof Message) {
      message = response;
    } else if (response instanceof InteractionCallbackResponse) {
      message = response.resource?.message ?? undefined;
    } else if (response.interaction) {
      const interaction = response.interaction as CommandInteraction;
      message = await interaction.fetchReply().catch(() => undefined);
    }

    if (!message) {
      return;
    }

    this.scheduleDeletion(message.channelId, message.id, timeoutSeconds);
  }

  private async deleteMessage(channelId: string, messageId: string) {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        this.logger.warn(
          `Unable to delete message ${messageId} in channel ${channelId}, channel is not text based`,
        );
        return;
      }
      await channel.messages.delete(messageId);
    } catch (error) {
      this.logger.warn(
        `Failed to delete message '${messageId}' in channel '${channelId}': ${
          (error as Error).message
        }`,
      );
    }
  }
}
