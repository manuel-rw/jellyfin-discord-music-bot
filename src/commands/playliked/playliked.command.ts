import { Command, Handler, IA } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import {
  CommandInteraction,
  GuildMember,
  InteractionReplyOptions,
  MessageFlags,
} from 'discord.js';
import { buildMessage } from '../../clients/discord/discord.message.builder';
import { DiscordVoiceService } from '../../clients/discord/discord.voice.service';
import { JellyfinSearchService } from '../../clients/jellyfin/search/jellyfin.search.service';
import { PlaybackService } from '../../playback/playback.service';
import { defaultMemberPermissions } from '../../utils/environment';
import { formatMillisecondsAsHumanReadable } from '../../utils/timeUtils';

@Command({
  name: 'playliked',
  description: 'Enqueue all liked songs from Jellyfin',
  defaultMemberPermissions,
})
@Injectable()
export class PlayLikedCommand {
  constructor(
    private readonly jellyfinSearchService: JellyfinSearchService,
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildMember = interaction.member as GuildMember;
    const tryResult =
      this.discordVoiceService.tryJoinChannelAndEstablishVoiceConnection(
        guildMember,
      );

    if (!tryResult.success) {
      const replyOptions = tryResult.reply as InteractionReplyOptions;
      await interaction.editReply({
        embeds: replyOptions.embeds,
      });
      return;
    }

    const likedItems = await this.jellyfinSearchService.getLikedTracks();
    if (likedItems.length === 0) {
      await interaction.editReply({
        embeds: [
          buildMessage({
            title: 'No liked songs found',
            description:
              'I could not find any liked audio tracks in your Jellyfin user account.',
          }),
        ],
      });
      return;
    }

    const tracks = (
      await Promise.all(
        likedItems.map((item) => item.toTracks(this.jellyfinSearchService)),
      )
    ).flat();

    if (tracks.length === 0) {
      await interaction.editReply({
        embeds: [
          buildMessage({
            title: 'No liked songs found',
            description:
              'I found liked items, but no playable tracks could be extracted.',
          }),
        ],
      });
      return;
    }

    this.playbackService.getPlaylistOrDefault().enqueueTracks(tracks);

    const totalDuration = tracks.reduce(
      (sum, track) => sum + track.duration,
      0,
    );
    await interaction.editReply({
      embeds: [
        buildMessage({
          title: `Added ${tracks.length} liked tracks`,
          description: `Added ${tracks.length} liked tracks to your playlist (${formatMillisecondsAsHumanReadable(totalDuration)}).`,
        }),
      ],
    });
  }
}
