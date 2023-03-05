import {
  Filter,
  InjectCauseEvent,
  InteractionEventCollector,
  On,
} from '@discord-nestjs/core';
import { forwardRef, Inject, Injectable, Scope } from '@nestjs/common';
import { ButtonInteraction, ChatInputCommandInteraction, InteractionUpdateOptions } from 'discord.js';
import { PlaylistCommand } from './playlist.command';

@Injectable({ scope: Scope.REQUEST })
@InteractionEventCollector({ time: 15 * 1000 })
export class PlaylistInteractionCollector {
  constructor(
    @Inject(forwardRef(() => PlaylistCommand))
    private readonly playlistCommand: PlaylistCommand,
    @InjectCauseEvent()
    private readonly causeInteraction: ChatInputCommandInteraction,
  ) {}

  @Filter()
  filter(interaction: ButtonInteraction): boolean {
    return this.causeInteraction.id === interaction.message.interaction.id;
  }

  @On('collect')
  async onCollect(interaction: ButtonInteraction): Promise<void> {
    const reply = this.playlistCommand.getReplyForPage(0);
    await interaction.update(reply as InteractionUpdateOptions);
  }
}
