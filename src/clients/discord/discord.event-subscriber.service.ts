import { Injectable, Scope } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DiscordVoiceService } from './discord.voice.service';
import { PlaybackService } from '../../playback/playback.service';

@Injectable({ scope: Scope.DEFAULT })
export class DiscordEventSubscriberService {
  constructor(
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly playbackService: PlaybackService,
  ) {}

  @OnEvent('internal.voice.controls.setVolume')
  private onChangeVolume({ volume }: { volume: number }) {
    this.discordVoiceService.changeCurrentResourceVolume(volume);
    this.playbackService.setVolume(volume);
  }
}
