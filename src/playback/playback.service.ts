import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import { Playlist } from '../models/playlist';

@Injectable()
export class PlaybackService {
  private playlist: Playlist | undefined = undefined;

  /**
   * The volume of the playback.
   * Can between 0 and 1.
   * @private
   */
  private volume = 1;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  getPlaylistOrDefault(): Playlist {
    if (this.playlist) {
      return this.playlist;
    }

    this.playlist = new Playlist(this.eventEmitter);
    return this.playlist;
  }

  setVolume(volume: number) {
    if (volume < 0 || volume > 1) {
      throw new Error('Volume must be between 0 and 1');
    }
    this.volume = volume;
  }

  getVolume() {
    return this.volume;
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
