import {
  Command,
  DiscordCommand,
  InjectDiscordClient,
} from '@discord-nestjs/core';

import { getSystemApi } from '@jellyfin/sdk/lib/utils/api/system-api';

import { Injectable } from '@nestjs/common';

import { Client, CommandInteraction, Status } from 'discord.js';

import { formatDuration, intervalToDuration } from 'date-fns';

import { Constants } from '../utils/constants';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { JellyfinService } from '../clients/jellyfin/jellyfin.service';

@Command({
  name: 'status',
  description: 'Display the current status for troubleshooting',
})
@Injectable()
export class StatusCommand implements DiscordCommand {
  constructor(
    @InjectDiscordClient()
    private readonly client: Client,
    private readonly discordMessageService: DiscordMessageService,
    private readonly jellyfinService: JellyfinService,
  ) {}

  async handler(interaction: CommandInteraction): Promise<void> {
    await interaction.reply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Retrieving status information...',
        }),
      ],
    });

    const ping = this.client.ws.ping;
    const status = Status[this.client.ws.status];

    const interval = intervalToDuration({
      start: this.client.uptime,
      end: 0,
    });
    const formattedDuration = formatDuration(interval);

    const jellyfinSystemApi = getSystemApi(this.jellyfinService.getApi());
    const jellyfinSystemInformation = await jellyfinSystemApi.getSystemInfo();

    await interaction.editReply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Discord Bot Status',
          mixin(embedBuilder) {
            return embedBuilder.addFields([
              {
                name: 'Bot Version',
                value: Constants.Metadata.Version.All(),
                inline: true,
              },
              {
                name: 'Discord Bot Ping',
                value: `${ping}ms`,
                inline: true,
              },
              {
                name: 'Discord Bot Status',
                value: `${status}`,
                inline: true,
              },
              {
                name: 'Discord Bot Uptime',
                value: `${formattedDuration}`,
                inline: false,
              },
              {
                name: 'Jellyfin Server Version',
                value: jellyfinSystemInformation.data.Version ?? 'unknown',
                inline: true,
              },
              {
                name: 'Jellyfin Server Operating System',
                value:
                  jellyfinSystemInformation.data.OperatingSystem ?? 'unknown',
                inline: true,
              },
            ]);
          },
        }),
      ],
    });
  }
}
