import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import { GenericPlaylist } from '../models/shared/GenericPlaylist';

@Injectable()
export class PlaybackService {
  private readonly logger = new Logger(PlaybackService.name);
  private playlist: GenericPlaylist | undefined = undefined;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  getPlaylistOrDefault(): GenericPlaylist {
    if (this.playlist) {
      return this.playlist;
    }

    this.playlist = new GenericPlaylist(this.eventEmitter);
    return this.playlist;
  }
}
