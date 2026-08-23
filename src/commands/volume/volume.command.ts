import { SlashCommandPipe } from '@discord-nestjs/common';
import { Command, Handler, IA, InteractionEvent } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';

import { Injectable, UseGuards } from '@nestjs/common/decorators';

import { CommandInteraction } from 'discord.js';
import { sleepAsync } from '../../utils/timeUtils';
import { VolumeCommandParams } from './volume.params';
import { defaultMemberPermissions } from '../../utils/environment';
import { DiscordVoiceService } from '../../clients/discord/discord.voice.service';
import { PlaybackService } from '../../playback/playback.service';
import { buildMessage } from '../../clients/discord/discord.message.builder';
import { ChannelLockGuard } from '../../clients/discord/guards/channel-lock.guard';
import { DiscordMessageCleanupService } from '../../clients/discord/discord.message-cleanup.service';

@Injectable()
@UseGuards(ChannelLockGuard)
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
    private readonly messageCleanupService: DiscordMessageCleanupService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: VolumeCommandParams,
    @IA() interaction: CommandInteraction,
  ): Promise<void> {
    await interaction.deferReply();

    if (!this.playbackService.getPlaylistOrDefault().hasActiveTrack()) {
      await this.messageCleanupService.scheduleResponseDeletion(
        await interaction.editReply({
          embeds: [
            buildMessage({
              title: 'Unable to change your volume',
              description:
                'The bot is not playing any music or is not streaming to a channel',
            }),
          ],
        }),
      );
      return;
    }

    const volume = dto.volume / 100;

    this.logger.debug(
      `Calculated volume ${volume} from dto param ${dto.volume}`,
    );

    this.discordVoiceService.changeCurrentResourceVolume(volume);
    this.playbackService.setVolume(volume);

    // Discord takes some time to react. Confirmation message should appear after the actual change
    await sleepAsync(1500);

    await this.messageCleanupService.scheduleResponseDeletion(
      await interaction.editReply({
        embeds: [
          buildMessage({
            title: `Successfully set volume to ${dto.volume.toFixed(0)}%`,
            description:
              'Updating may take a few seconds to take effect.\nPlease note that listening at a high volume for a long time may damage your hearing',
          }),
        ],
      }),
    );
  }
}
