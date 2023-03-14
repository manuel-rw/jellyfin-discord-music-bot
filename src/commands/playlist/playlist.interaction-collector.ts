import {
  Filter,
  InjectCauseEvent,
  InteractionEventCollector,
  On,
} from '@discord-nestjs/core';

import { forwardRef, Inject, Injectable, Scope } from '@nestjs/common';
import { Logger } from '@nestjs/common/services';

import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  InteractionUpdateOptions,
} from 'discord.js';

import { PlaylistCommand } from './playlist.command';

@Injectable({ scope: Scope.REQUEST })
@InteractionEventCollector({ time: 60 * 1000 })
export class PlaylistInteractionCollector {
  private readonly logger = new Logger(PlaylistInteractionCollector.name);

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
    const targetPage = this.getInteraction(interaction);
    this.logger.verbose(
      `Extracted the target page ${targetPage} from the button interaction`,
    );

    if (targetPage === undefined) {
      await interaction.update({
        content: 'Unknown error',
      });
      return;
    }

    this.logger.debug(
      `Updating current page for interaction ${this.causeInteraction.id} to ${targetPage}`,
    );
    this.playlistCommand.pageData.set(this.causeInteraction.id, targetPage);
    const reply = this.playlistCommand.getReplyForPage(targetPage);
    await interaction.update(reply as InteractionUpdateOptions);
  }

  private getInteraction(interaction: ButtonInteraction): number | null {
    const current = this.playlistCommand.pageData.get(this.causeInteraction.id);

    if (current === undefined) {
      this.logger.warn(
        `Unable to extract the current page from the cause interaction '${this.causeInteraction.id}'`,
      );
      return undefined;
    }

    this.logger.debug(
      `Retrieved current page from command using id '${
        this.causeInteraction.id
      }' in list of ${
        Object.keys(this.playlistCommand.pageData).length
      }: ${current}`,
    );

    switch (interaction.customId) {
      case 'playlist-controls-next':
        return current + 1;
      case 'playlist-controls-previous':
        return current - 1;
      default:
        this.logger.error(
          `Unable to map button interaction from collector to target page`,
        );
        return undefined;
    }
  }
}
