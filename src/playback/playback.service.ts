import { Injectable, Logger } from '@nestjs/common';
import { Playlist } from '../types/playlist';
import { Track } from '../types/track';

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PlaybackService {
  private readonly logger = new Logger(PlaybackService.name);

  private readonly playlist: Playlist = {
    tracks: [],
    activeTrack: null,
  };

  constructor(private readonly eventEmitter: EventEmitter2) {}

  getActiveTrack() {
    return this.getTrackById(this.playlist.activeTrack);
  }

  setActiveTrack(trackId: string) {
    const track = this.getTrackById(trackId);

    if (!track) {
      throw Error('track is not in playlist');
    }

    this.playlist.activeTrack = track.id;
  }

  nextTrack() {
    const keys = this.getTrackIds();
    const index = this.getActiveIndex();

    if (!this.hasActiveTrack() || index + 1 >= keys.length) {
      this.logger.debug(
        `Unable to go to next track, because playback has reached end of the playlist`,
      );
      return false;
    }

    const newKey = keys[index + 1];
    this.setActiveTrack(newKey);
    this.controlAudioPlayer();
    return true;
  }

  previousTrack() {
    const index = this.getActiveIndex();

    if (!this.hasActiveTrack() || index < 1) {
      this.logger.debug(
        `Unable to go to previous track, because there is no previous track in the playlist`,
      );
      return false;
    }

    const keys = this.getTrackIds();
    const newKey = keys[index - 1];
    this.setActiveTrack(newKey);
    this.controlAudioPlayer();
    return true;
  }

  eneuqueTrack(track: Track) {
    const uuid = uuidv4();

    const emptyBefore = this.playlist.tracks.length === 0;

    this.playlist.tracks.push({
      id: uuid,
      track: track,
    });

    if (emptyBefore) {
      this.setActiveTrack(this.playlist.tracks.find((x) => x.id === uuid).id);
      this.controlAudioPlayer();
    }

    return this.playlist.tracks.findIndex((x) => x.id === uuid);
  }

  set(tracks: Track[]) {
    this.playlist.tracks = tracks.map((t) => ({
      id: uuidv4(),
      track: t,
    }));
  }

  clear() {
    this.playlist.tracks = [];
  }

  hasNextTrack() {
    return this.getActiveIndex() + 1 < this.getTrackIds().length;
  }

  hasActiveTrack() {
    return this.playlist.activeTrack !== null;
  }

  getPlaylist(): Playlist {
    return this.playlist;
  }

  private getTrackById(id: string) {
    return this.playlist.tracks.find((x) => x.id === id);
  }

  private getTrackIds() {
    return this.playlist.tracks.map((item) => item.id);
  }

  private getActiveIndex() {
    return this.getTrackIds().indexOf(this.playlist.activeTrack);
  }

  private controlAudioPlayer() {
    const activeTrack = this.getActiveTrack();
    this.logger.debug(
      `A new track (${activeTrack.id}) was requested and will be emmitted as an event`,
    );
    this.eventEmitter.emit('playback.newTrack', activeTrack.track);
  }
}