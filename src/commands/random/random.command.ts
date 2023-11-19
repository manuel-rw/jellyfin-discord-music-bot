import { SlashCommandPipe } from '@discord-nestjs/common';
import { Command, Handler, IA, InteractionEvent } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import {
  CommandInteraction,
  GuildMember,
  InteractionReplyOptions,
} from 'discord.js';
import { DiscordMessageService } from 'src/clients/discord/discord.message.service';
import { DiscordVoiceService } from 'src/clients/discord/discord.voice.service';
import { JellyfinSearchService } from 'src/clients/jellyfin/jellyfin.search.service';
import { SearchItem } from 'src/models/search/SearchItem';
import { PlaybackService } from 'src/playback/playback.service';
import { RandomCommandParams } from './random.params';
import { defaultMemberPermissions } from 'src/utils/environment';

@Command({
  name: 'random',
  description: 'Enqueues a random selection of tracks to your playlist',
  defaultMemberPermissions,
})
@Injectable()
export class EnqueueRandomItemsCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly jellyfinSearchService: JellyfinSearchService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: RandomCommandParams,
    @IA() interaction: CommandInteraction,
  ): Promise<void> {
    await interaction.deferReply();

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

    const items = await this.jellyfinSearchService.getRandomTracks(dto.count);
    const tracks = await this.getTracks(items);

    this.playbackService.getPlaylistOrDefault().enqueueTracks(tracks);

    await interaction.editReply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: `Added ${tracks.length} tracks to your playlist`,
          description: 'Use ``/playlist`` to see them',
        }),
      ],
    });
  }

  private async getTracks(hints: SearchItem[]) {
    const promises = await Promise.all(
      hints.flatMap(async (item) => {
        const tracks = await item.toTracks(this.jellyfinSearchService);
        return tracks;
      }),
    );

    return promises.flatMap((x) => x);
  }
}
