import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import { CommandInteraction, GuildMember } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { GenericCustomReply } from '../models/generic-try-handler';

@Command({
  name: 'summon',
  description: 'Join your current voice channel',
})
@UsePipes(TransformPipe)
export class SummonCommand implements DiscordCommand {
  private readonly logger = new Logger(SummonCommand.name);

  constructor(
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  handler(interaction: CommandInteraction): GenericCustomReply {
    const guildMember = interaction.member as GuildMember;

    const tryResult =
      this.discordVoiceService.tryJoinChannelAndEstablishVoiceConnection(
        guildMember,
      );

    if (!tryResult.success) {
      return tryResult.reply;
    }

    return {
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Joined your voicehannel',
          description:
            "I'm ready to play media. Use ``Cast to device`` in Jellyfin or the ``/play`` command to get started.",
        }),
      ],
    };
  }
}
