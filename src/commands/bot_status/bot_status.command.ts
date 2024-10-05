import { SlashCommandPipe } from '@discord-nestjs/common';
import {
  Command,
  Handler,
  IA,
  InjectDiscordClient,
  InteractionEvent,
} from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { Client, CommandInteraction } from 'discord.js';
import { BotStatusDto } from './bot_status.params';

@Command({
  name: 'bot-status',
  description: "Change the bot's status",
  defaultMemberPermissions: ['Administrator'],
  dmPermission: false,
})
@Injectable()
export class BotStatusCommand {
  constructor(
    @InjectDiscordClient()
    private readonly client: Client,
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
    await interaction.reply('Bot status updated!');
  }
}
