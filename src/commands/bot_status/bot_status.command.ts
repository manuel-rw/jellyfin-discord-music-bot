import { SlashCommandPipe } from '@discord-nestjs/common';
import {
  Command,
  Handler,
  IA,
  InjectDiscordClient,
  InteractionEvent,
} from '@discord-nestjs/core';
import { Injectable, UseGuards } from '@nestjs/common';
import { Client, CommandInteraction } from 'discord.js';
import { BotStatusDto } from './bot_status.params';
import { ChannelLockGuard } from '../../clients/discord/guards/channel-lock.guard';
import { DeferReplyGuard } from '../../clients/discord/guards/defer-reply.guard';
import { DiscordMessageCleanupService } from '../../clients/discord/discord.message-cleanup.service';

@Command({
  name: 'bot-status',
  description: "Change the bot's status",
  defaultMemberPermissions: ['Administrator'],
})
@Injectable()
@UseGuards(DeferReplyGuard, ChannelLockGuard)
export class BotStatusCommand {
  constructor(
    @InjectDiscordClient()
    private readonly client: Client,
    private readonly messageCleanupService: DiscordMessageCleanupService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: BotStatusDto,
    @IA() interaction: CommandInteraction,
  ) {
    const { activity, status, text } = dto;

    const newStatus = {
      activities: [
        {
          name: text,
          type: activity,
        },
      ],
      status,
    };

    this.client.user?.setPresence(newStatus);
    await this.messageCleanupService.scheduleResponseDeletion(
      await interaction.editReply({
        content: 'Bot status updated!',
      }),
    );
  }
}
