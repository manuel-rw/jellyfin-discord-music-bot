import { Injectable } from '@nestjs/common';
import { Playlist } from '../types/playlist';
import { Track } from '../types/track';

import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PlaybackService {
  private readonly playlist: Playlist = {
    tracks: [],
    activeTrack: null,
  };

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

  eneuqueTrack(track: Track) {
    const uuid = uuidv4();
    this.playlist.tracks.push({
      id: uuid,
      track: track,
    });
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

  private getTrackById(id: string) {
    return this.playlist.tracks.find((x) => x.id === id);
  }
}
