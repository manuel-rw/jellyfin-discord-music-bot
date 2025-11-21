import { SlashCommandPipe } from '@discord-nestjs/common';
import { Command, Handler, IA, InteractionEvent } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';

import { Injectable } from '@nestjs/common/decorators';

import { CommandInteraction } from 'discord.js';
import { DiscordMessageService } from 'src/clients/discord/discord.message.service';
import { DiscordVoiceService } from 'src/clients/discord/discord.voice.service';
import { PlaybackService } from 'src/playback/playback.service';
import { sleepAsync } from '../../utils/timeUtils';
import { VolumeCommandParams } from './volume.params';
import { defaultMemberPermissions } from '../../utils/environment';

@Injectable()
@Command({
  name: 'volume',
  description: 'Change the volume',
  defaultMemberPermissions,
})
export class VolumeCommand {
  private readonly logger = new Logger(VolumeCommand.name);

  constructor(
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: VolumeCommandParams,
    @IA() interaction: CommandInteraction,
  ): Promise<void> {
    await interaction.deferReply();

    if (!this.playbackService.getPlaylistOrDefault().hasActiveTrack()) {
      await interaction.editReply({
        embeds: [
          DiscordMessageService.buildMessage({
            title: 'Unable to change your volume',
            description:
              'The bot is not playing any music or is not streaming to a channel',
          }),
        ],
      });
      return;
    }

    const volume = dto.volume / 100;

    this.logger.debug(
      `Calculated volume ${volume} from dto param ${dto.volume}`,
    );

    this.discordVoiceService.changeVolume(volume);

    // Discord takes some time to react. Confirmation message should appear after actual change
    await sleepAsync(1500);

    await interaction.editReply({
      embeds: [
        DiscordMessageService.buildMessage({
          title: `Successfully set volume to ${dto.volume.toFixed(0)}%`,
          description:
            'Updating may take a few seconds to take effect.\nPlease note that listening at a high volume for a long time may damage your hearing',
        }),
      ],
    });
  }
}
