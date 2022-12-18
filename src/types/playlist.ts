import { Track } from './track';

export interface Playlist {
  tracks: {
    id: string;
    track: Track;
  }[];
  activeTrack: string | null;
}
