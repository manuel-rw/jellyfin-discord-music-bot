import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import { Playlist } from '../models/music/Playlist';

@Injectable()
export class PlaybackService {
  private playlist: Playlist | undefined = undefined;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  getPlaylistOrDefault(): Playlist {
    if (this.playlist) {
      return this.playlist;
    }

    this.playlist = new Playlist(this.eventEmitter);
    return this.playlist;
  }

  @OnEvent('internal.audio.track.previous')
  private handlePreviousTrackEvent() {
    this.getPlaylistOrDefault().setPreviousTrackAsActiveTrack();
  }

  @OnEvent('internal.audio.track.next')
  private handleNextTrackEvent() {
    this.getPlaylistOrDefault().setNextTrackAsActiveTrack();
  }
}
