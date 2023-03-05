import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Playlist } from '../models/shared/Playlist';

@Injectable()
export class PlaybackService {
  private readonly logger = new Logger(PlaybackService.name);
  private playlist: Playlist | undefined = undefined;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  getPlaylistOrDefault(): Playlist {
    if (this.playlist) {
      return this.playlist;
    }

    this.playlist = new Playlist(this.eventEmitter);
    return this.playlist;
  }
}
