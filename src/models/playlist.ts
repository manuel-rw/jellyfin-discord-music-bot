import { EventEmitter2 } from '@nestjs/event-emitter';

import { Track } from './track';

export class Playlist {
  tracks: Track[];
  activeTrackIndex?: number;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.tracks = [];
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
   * Shuffle all tracks in the playlist except the active one
   */
  shuffle() {
    if (!this.hasActiveTrack())
      this.tracks = this.tracks.sort(() => Math.random() - 0.5);
    else {
      // Shuffle all tracks except the active one
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const activeTrack = this.tracks.splice(this.activeTrackIndex!, 1)[0];
      this.tracks = this.tracks.sort(() => Math.random() - 0.5);
      this.tracks.unshift(activeTrack);
      this.activeTrackIndex = 0;
      this.announceTrackChange();
    }
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
   * @param playNext play track as the next track in the playlist
   * @returns the new length of the tracks in the playlist
   */
  enqueueTracks(tracks: Track[], playNext = false) {
    if (tracks.length === 0) {
      return 0;
    }

    const previousTrackLength = this.tracks.length;

    this.eventEmitter.emit('controls.playlist.tracks.enqueued', {
      count: tracks.length,
      activeTrack: this.activeTrackIndex,
    });

    if (playNext) {
      this.tracks = [...tracks, ...this.tracks];
    } else {
      this.tracks.push(...tracks);
    }

    // existing tracks are in the playlist, but none are playing. play the first track out of the new tracks
    if (!this.hasAnyPlaying() && tracks.length > 0) {
      this.activeTrackIndex = previousTrackLength;
      this.announceTrackChange();
      return this.tracks.length;
    }

    // emit a track change if there is no item
    if (this.activeTrackIndex === undefined) {
      this.announceTrackChange();
    }

    return this.tracks.length;
  }

  /**
   * Check if there is a next track
   * @returns if there is a track next in the playlist
   */
  hasNextTrackInPlaylist() {
    return (this.activeTrackIndex ?? 0) + 1 < this.tracks.length;
  }

  clear() {
    this.eventEmitter.emit('controls.playlist.tracks.clear');
    this.tracks = [];
    this.activeTrackIndex = undefined;
  }

  hasAnyPlaying() {
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
