import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs';
import * as path from 'path';

import { Playlist } from '../models/music/Playlist';
import { Track } from '../models/music/Track';

@Injectable()
export class PlaybackService {
  private readonly logger = new Logger(PlaybackService.name);

  // ---- Persistent Volume System ----
  private currentVolume = 1.0;
  private readonly volumeFilePath = path.join(process.cwd(), 'config', 'volume.json');
  private playlist: Playlist | undefined;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.ensureVolumeFile();
    this.loadVolume();
  }

  /**
   * Ensures that the config directory and volume.json exist.
   */
  private ensureVolumeFile() {
    try {
      const dir = path.dirname(this.volumeFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.debug(`📁 Created config directory at ${dir}`);
      }

      if (!fs.existsSync(this.volumeFilePath)) {
        fs.writeFileSync(this.volumeFilePath, JSON.stringify({ volume: 1.0 }, null, 2), 'utf8');
        this.logger.debug('🆕 Created default volume.json with 100% volume.');
      }
    } catch (err) {
      this.logger.error(`❌ Failed to initialize volume file: ${err}`);
    }
  }

  /**
   * Loads the saved volume value from disk.
   */
  private loadVolume() {
    try {
      const data = fs.readFileSync(this.volumeFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (typeof parsed.volume === 'number' && parsed.volume >= 0) {
        this.currentVolume = parsed.volume;
        this.logger.debug(`🎚️ Loaded saved volume: ${(this.currentVolume * 100).toFixed(0)}%`);
      } else {
        this.logger.warn('⚠️ Invalid data in volume.json, resetting to default.');
        this.saveVolume(1.0);
      }
    } catch (err) {
      this.logger.error(`❌ Failed to load saved volume: ${err}`);
      this.saveVolume(1.0);
    }
  }

  /**
   * Saves the provided volume value to disk.
   */
  private saveVolume(volume: number) {
    try {
      const dir = path.dirname(this.volumeFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.volumeFilePath, JSON.stringify({ volume }, null, 2), 'utf8');
      this.logger.debug('✅ Volume saved to volume.json');
    } catch (err) {
      this.logger.error(`❌ Failed to save volume to disk: ${err}`);
    }
  }

  /**
   * Sets the current playback volume and persists it.
   */
  public setVolume(volume: number) {
    this.currentVolume = volume;
    this.logger.debug(`🔊 Persistent volume set to ${(volume * 100).toFixed(0)}%`);
    this.saveVolume(volume);
  }

  /**
   * Returns the current persistent volume.
   */
  public getVolume(): number {
    return this.currentVolume;
  }

  // ---- Playlist Logic ----

  public getPlaylistOrDefault(): Playlist {
    if (!this.playlist) {
      this.playlist = new Playlist(this.eventEmitter);
      this.logger.debug('🎵 Created new playlist instance.');
    }
    return this.playlist;
  }

  public setPlaylist(playlist: Playlist) {
    this.playlist = playlist;
  }

  public clearPlaylist() {
    if (this.playlist) {
      this.playlist.clear();
      this.logger.debug('🧹 Cleared playlist.');
    }
  }

  public addTrack(track: Track) {
    this.getPlaylistOrDefault().enqueueTracks([track]);
    this.logger.debug(`➕ Added track: ${track.name ?? track.id}`);
  }

  public stopPlayback() {
    this.logger.debug('⏹️ Stopping playback...');
    this.eventEmitter.emit('internal.voice.controls.stop', true);
  }
}
