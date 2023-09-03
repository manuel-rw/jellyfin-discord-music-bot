import { EventEmitter2 } from '@nestjs/event-emitter';

import { Track } from './Track';

export class Playlist {
  tracks: Track[];
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
  getActiveTrack(): Track | undefined {
    if (this.isActiveTrackOutOfSync() || this.activeTrackIndex === undefined) {
      return undefined;
    }
    return this.tracks[this.activeTrackIndex];
  }

  isEmpty(): boolean {
    return this.tracks.length === 0;
  }

  hasActiveTrack(): boolean {
    return (
      this.activeTrackIndex !== undefined && !this.isActiveTrackOutOfSync()
    );
  }

  getLength() {
    return this.tracks.length;
  }

  /**
   * Go to the next track in the playlist
   * @returns if the track has been changed successfully
   */
  setNextTrackAsActiveTrack(): boolean {
    this.announceTrackFinishIfSet();

    if (
      this.activeTrackIndex === undefined ||
      this.activeTrackIndex >= this.tracks.length
    ) {
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
    this.announceTrackFinishIfSet();

    if (this.activeTrackIndex === undefined || this.activeTrackIndex <= 0) {
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
  enqueueTracks(tracks: Track[]) {
    if (tracks.length === 0) {
      return 0;
    }

    const previousTrackLength = this.tracks.length;

    this.eventEmitter.emit('controls.playlist.tracks.enqueued', {
      count: tracks.length,
      activeTrack: this.activeTrackIndex,
    });
    const length = this.tracks.push(...tracks);

    // existing tracks are in the playlist, but none are playing. play the first track out of the new tracks
    if (!this.hasAnyPlaying() && tracks.length > 0) {
      this.activeTrackIndex = previousTrackLength;
      this.announceTrackChange();
      return length;
    }

    // emit a track change if there is no item
    if (this.activeTrackIndex === undefined) {
      this.announceTrackChange();
    }

    return length;
  }

  /**
   * Check if there is a next track
   * @returns if there is a track next in the playlist
   */
  hasNextTrackInPlaylist() {
    return (this.activeTrackIndex ?? 0) + 1 < this.tracks.length;
  }

  /**
   * Check if there is a previous track
   * @returns if there is a previous track in the playlist
   */
  hasPreviousTrackInPlaylist() {
    return this.activeTrackIndex !== undefined && this.activeTrackIndex > 0;
  }

  clear() {
    this.eventEmitter.emit('controls.playlist.tracks.clear');
    this.tracks = [];
    this.activeTrackIndex = undefined;
  }

  private hasAnyPlaying() {
    return this.tracks.some((track) => track.playing);
  }

  private announceTrackFinishIfSet() {
    if (this.activeTrackIndex === undefined) {
      return;
    }

    const currentTrack = this.getActiveTrack();
    this.eventEmitter.emit('internal.audio.track.finish', currentTrack);
  }

  private announceTrackChange() {
    if (!this.activeTrackIndex) {
      this.activeTrackIndex = 0;
    }

    const activeTrack = this.getActiveTrack();

    if (!activeTrack) {
      return;
    }

    activeTrack.playing = true;
    this.eventEmitter.emit('internal.audio.track.announce', activeTrack);
  }

  private isActiveTrackOutOfSync(): boolean {
    return (
      this.activeTrackIndex === undefined ||
      this.activeTrackIndex < 0 ||
      this.activeTrackIndex >= this.tracks.length
    );
  }
}

export type PlaylistPlaybackType =
  | 'once'
  | 'repeat-once'
  | 'repeat-indefinetly'
  | 'shuffle';
