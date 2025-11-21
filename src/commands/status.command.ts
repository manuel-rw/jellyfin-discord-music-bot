import {
  Command,
  Handler,
  IA,
  InjectDiscordClient,
} from '@discord-nestjs/core';

import { getSystemApi } from '@jellyfin/sdk/lib/utils/api/system-api';

import { Injectable } from '@nestjs/common';

import { Client, CommandInteraction, Status } from 'discord.js';

import { formatDuration, intervalToDuration } from 'date-fns';

import { buildMessage } from '../clients/discord/discord.message.builder';
import { JellyfinService } from '../clients/jellyfin/jellyfin.service';
import { Constants } from '../utils/constants';
import { trimStringToFixedLength } from '../utils/stringUtils/stringUtils';

@Command({
  name: 'status',
  description: 'Display the current status for troubleshooting',
  defaultMemberPermissions: 'ViewChannel',
})
@Injectable()
export class StatusCommand {
  constructor(
    @InjectDiscordClient()
    private readonly client: Client,
    private readonly jellyfinService: JellyfinService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    await interaction.reply({
      embeds: [
        buildMessage({
          title: 'Retrieving status information...',
        }),
      ],
    });

    const ping = this.client.ws.ping;
    const status = Status[this.client.ws.status];

    const interval = intervalToDuration({
      start: this.client.uptime ?? 0,
      end: 0,
    });
    const formattedDuration = formatDuration(interval);

    const jellyfinSystemApi = getSystemApi(this.jellyfinService.getApi());
    const jellyfinSystemInformation = await jellyfinSystemApi.getSystemInfo();

    await interaction.editReply({
      embeds: [
        buildMessage({
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
                value: trimStringToFixedLength(
                  jellyfinSystemInformation.data.Version as string,
                  1024,
                ),
                inline: true,
              },
              {
                name: 'Jellyfin Server Operating System',
                value: trimStringToFixedLength(
                  jellyfinSystemInformation.data.OperatingSystem as string,
                  1024,
                  'N/A',
                ),
                inline: true,
              },
            ]);
          },
        }),
      ],
    });
  }
}
