import { EventEmitter2 } from '@nestjs/event-emitter';

import { GenericTrack } from './GenericTrack';

export class GenericPlaylist {
  tracks: GenericTrack[];
  activeTrackIndex?: number;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.tracks = [];
  }

  /**
   * Returns if the playlist has been started.
   * Does not indicate if it's paused.
   * @returns if the playlist has been started and has an active track
   */
  hasStarted() {
    return this.activeTrackIndex !== undefined;
  }

  /**
   * Checks if the active track is out of bounds
   * @returns active track or undefined if there's none
   */
  getActiveTrack(): GenericTrack | undefined {
    if (this.isActiveTrackOutOfSync()) {
      return undefined;
    }
    return this.tracks[this.activeTrackIndex];
  }

  hasActiveTrack(): boolean {
    return (
      this.activeTrackIndex !== undefined && !this.isActiveTrackOutOfSync()
    );
  }

  /**
   * Go to the next track in the playlist
   * @returns if the track has been changed successfully
   */
  setNextTrackAsActiveTrack(): boolean {
    if (this.activeTrackIndex >= this.tracks.length) {
      return false;
    }

    this.activeTrackIndex++;
    this.eventEmitter.emit('controls.playlist.tracks.next', {
      newActive: this.activeTrackIndex,
    });
    this.announceTrackChange();
    return true;
  }

  /**
   * Go to the previous track in the playlist
   * @returns if the track has been changed successfully
   */
  setPreviousTrackAsActiveTrack(): boolean {
    if (this.activeTrackIndex <= 0) {
      return false;
    }

    this.activeTrackIndex--;
    this.eventEmitter.emit('controls.playlist.tracks.previous', {
      newActive: this.activeTrackIndex,
    });
    this.announceTrackChange();
    return true;
  }

  /**
   * Add new track(-s) to the playlist
   * @param tracks the tracks that should be added
   * @returns the new lendth of the tracks in the playlist
   */
  enqueueTracks(tracks: GenericTrack[]) {
    this.eventEmitter.emit('controls.playlist.tracks.enqueued', {
      count: tracks.length,
      activeTrack: this.activeTrackIndex,
    });
    const length = this.tracks.push(...tracks);
    this.announceTrackChange();
    return length;
  }

  /**
   * Check if there is a next track
   * @returns if there is a track next in the playlist
   */
  hasNextTrackInPlaylist() {
    return this.activeTrackIndex < this.tracks.length;
  }

  /**
   * Check if there is a previous track
   * @returns if there is a previous track in the playlist
   */
  hasPreviousTrackInPlaylist() {
    return this.activeTrackIndex > 0;
  }

  clear() {
    this.eventEmitter.emit('controls.playlist.tracks.clear');
    this.tracks = [];
    this.activeTrackIndex = undefined;
  }

  private announceTrackChange() {
    if (!this.activeTrackIndex) {
      this.activeTrackIndex = 0;
    }

    this.eventEmitter.emit('internal.audio.announce', this.getActiveTrack());
  }

  private isActiveTrackOutOfSync(): boolean {
    return (
      this.activeTrackIndex < 0 || this.activeTrackIndex >= this.tracks.length
    );
  }
}

export type PlaylistPlaybackType =
  | 'once'
  | 'repeat-once'
  | 'repeat-indefinetly'
  | 'shuffle';