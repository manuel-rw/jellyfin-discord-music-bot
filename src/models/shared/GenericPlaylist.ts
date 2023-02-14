import { GenericTrack } from './GenericTrack';

export class GenericPlaylist {
  tracks: GenericTrack[];
  activeTrackIndex?: number;

  constructor() {
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
