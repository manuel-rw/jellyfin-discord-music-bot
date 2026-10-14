import { Api } from '@jellyfin/sdk';
import { SessionApi } from '@jellyfin/sdk/lib/generated-client/api/session-api';
import {
  BaseItemKind,
  GeneralCommandType,
} from '@jellyfin/sdk/lib/generated-client/models';
import { getSessionApi } from '@jellyfin/sdk/lib/utils/api/session-api';

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { Track } from '../../models/track';

import { PlaybackService } from '../../playback/playback.service';
import { EventNames } from '../../events/names';

@Injectable()
export class JellyfinPlayStateService {
  private sessionApi?: SessionApi;

  constructor(private readonly playbackService: PlaybackService) {}

  private readonly logger = new Logger(JellyfinPlayStateService.name);

  async initializePlayState(api: Api) {
    this.initializeApis(api);
    await this.reportCapabilitiesAsync();
  }

  private initializeApis(api: Api) {
    this.sessionApi = getSessionApi(api);
  }

  private async reportCapabilitiesAsync() {
    if (!this.sessionApi) {
      throw new Error('Session API is not initalized yet');
    }
    await this.sessionApi.postCapabilities({
      playableMediaTypes: [BaseItemKind[BaseItemKind.Audio]],
      supportsMediaControl: true,
      supportedCommands: [
        GeneralCommandType.Play,
        GeneralCommandType.PlayState,
        GeneralCommandType.SetVolume,
      ],
    });

    this.logger.debug('Reported playback capabilities successfully');
  }

  @OnEvent(EventNames.Circuit.AnnounceTrack)
  private async onPlaybackNewTrack(track: Track) {
    if (!this.sessionApi) {
      throw new Error('Play State API is not initalized yet');
    }
    this.logger.debug(`Reporting playback start on track '${track.id}'`);
    await this.sessionApi.reportPlaybackStart({
      playbackStartInfo: {
        ItemId: track.id,
        PositionTicks: 0,
      },
    });
  }

  @OnEvent(EventNames.Circuit.FinishedTrack)
  private async onPlaybackFinished(track: Track) {
    if (!track) {
      this.logger.error(
        'Unable to report playback because finished track was undefined',
      );
      return;
    }

    if (!this.sessionApi) {
      throw new Error('Play State API is not initalized yet');
    }

    this.logger.debug(`Reporting playback finish on track '${track.id}'`);
    await this.sessionApi.reportPlaybackStopped({
      playbackStopInfo: {
        ItemId: track.id,
        PositionTicks: track.playbackProgress * 10000,
      },
    });
  }

  @OnEvent(EventNames.Circuit.Paused)
  private async onPlaybackPause(paused: boolean) {
    const track = this.playbackService.getPlaylistOrDefault().getActiveTrack();

    if (!track) {
      this.logger.error(
        'Unable to report changed play state to Jellyfin because no track was active',
      );
      return;
    }

    if (!this.sessionApi) {
      throw new Error('Play State API is not initalized yet');
    }

    await this.sessionApi.reportPlaybackProgress({
      playbackProgressInfo: {
        IsPaused: paused,
        ItemId: track.id,
        PositionTicks: track.playbackProgress * 10000,
      },
    });
  }

  @Interval(1000)
  private async onPlaybackProgress() {
    const playlist = this.playbackService.getPlaylistOrDefault();
    const track = playlist.getActiveTrack();
    if (!track || !playlist.hasAnyPlaying()) {
      return;
    }

    if (!this.sessionApi) {
      throw new Error('Play State API is not initalized yet');
    }

    await this.sessionApi.reportPlaybackProgress({
      playbackProgressInfo: {
        ItemId: track.id,
        PositionTicks: track.playbackProgress * 10000,
      },
    });

    this.logger.verbose(
      `Reported playback progress ${track.playbackProgress} to Jellyfin for item ${track.id}`,
    );
  }
}
