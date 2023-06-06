import { Injectable, Logger } from '@nestjs/common';
import { PlaybackService } from '../playback/playback.service';
import { OnEvent } from '@nestjs/event-emitter';
import { JellyfinSearchService } from 'src/clients/jellyfin/jellyfin.search.service';
import { convertToTracks } from 'src/utils/trackConverter';

@Injectable()
export class RadioService {
  private readonly logger = new Logger(RadioService.name);

  constructor(
    private readonly playbackService: PlaybackService,
    private readonly jellyfinSearch: JellyfinSearchService,
  ) {}

  private radioEnabled = false;

  async enableRadio() {
    this.radioEnabled = true;
    this.onEnable();
  }

  disableRadio() {
    this.radioEnabled = false;
  }

  async toggle() {
    if (!this.radioEnabled) {
      await this.enableRadio();
    } else {
      this.disableRadio();
    }
    return this.radioEnabled;
  }

  isEnabled() {
    return this.radioEnabled;
  }

  private async onEnable() {
    this.playbackService.getPlaylistOrDefault().clear();
    await this.tryGetAndPlayNextTrack();
  }

  @OnEvent('internal.audio.track.no-next-track', { async: true })
  protected async onNoNextTrack() {
    await this.tryGetAndPlayNextTrack();
  }

  private async tryGetAndPlayNextTrack() {
    const randomTrack = await this.getRandomJellyfinTrack();

    if (!randomTrack) {
      this.logger.error(
        `Unable to process radio mode, because there is no next track`,
      );
      return;
    }

    this.playbackService.getPlaylistOrDefault().enqueueTracks([randomTrack]);
  }

  private async getRandomJellyfinTrack() {
    const items = await this.jellyfinSearch.getRandomTracks(1);
    const tracks = await convertToTracks(items, this.jellyfinSearch);
    return tracks.find(() => true);
  }
}
