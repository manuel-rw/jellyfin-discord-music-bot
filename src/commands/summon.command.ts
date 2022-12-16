import { TransformPipe } from '@discord-nestjs/common';

import { Command, DiscordCommand, UsePipes } from '@discord-nestjs/core';
import { joinVoiceChannel } from '@discordjs/voice';
import { Logger } from '@nestjs/common';
import {
  CommandInteraction,
  EmbedBuilder,
  GuildMember,
  InteractionReplyOptions
} from 'discord.js';
import { DefaultJellyfinColor } from '../types/colors';

@Command({
  name: 'summon',
  description: 'Join your current voice channel',
})
@UsePipes(TransformPipe)
export class SummonCommand implements DiscordCommand {
  private readonly logger = new Logger(SummonCommand.name);

  handler(interaction: CommandInteraction): InteractionReplyOptions | string {
    const guildMember = interaction.member as GuildMember;

    if (guildMember.voice.channel === null) {
      return {
        embeds: [
          new EmbedBuilder()
            .setColor(DefaultJellyfinColor)
            .setAuthor({
              name: 'Unable to join your channel',
              iconURL:
                'https://github.com/manuel-rw/jellyfin-discord-music-bot/blob/nestjs-migration/images/icons/alert-circle.png?raw=true',
            })
            .setDescription(
              'You are in a channel, I am either unabelt to connect to or you aren&apost in a channel yet',
            )
            .toJSON(),
        ],
      };
    }

    const channel = guildMember.voice.channel;

    joinVoiceChannel({
      channelId: channel.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      guildId: channel.guildId,
    });

    return {
      embeds: [
        new EmbedBuilder()
          .setColor(DefaultJellyfinColor)
          .setAuthor({
            name: 'Joined your voicehannel',
            iconURL:
              'https://github.com/manuel-rw/jellyfin-discord-music-bot/blob/nestjs-migration/images/icons/circle-check.png?raw=true&test=a',
          })
          .toJSON(),
      ],
    };
  }
}
