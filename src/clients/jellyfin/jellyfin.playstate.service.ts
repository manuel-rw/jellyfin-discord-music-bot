import { Api } from '@jellyfin/sdk';
import { PlaystateApi } from '@jellyfin/sdk/lib/generated-client/api/playstate-api';
import { SessionApi } from '@jellyfin/sdk/lib/generated-client/api/session-api';
import {
  BaseItemKind,
  GeneralCommandType,
} from '@jellyfin/sdk/lib/generated-client/models';
import { getPlaystateApi } from '@jellyfin/sdk/lib/utils/api/playstate-api';
import { getSessionApi } from '@jellyfin/sdk/lib/utils/api/session-api';

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { Track } from '../../models/music/Track';

import { PlaybackService } from '../../playback/playback.service';

@Injectable()
export class JellyinPlaystateService {
  private playstateApi: PlaystateApi;
  private sessionApi: SessionApi;

  constructor(private readonly playbackService: PlaybackService) {}

  private readonly logger = new Logger(JellyinPlaystateService.name);

  async initializePlayState(api: Api) {
    this.initializeApis(api);
    await this.reportCapabilities();
  }

  private async initializeApis(api: Api) {
    this.sessionApi = getSessionApi(api);
    this.playstateApi = getPlaystateApi(api);
  }

  private async reportCapabilities() {
    await this.sessionApi.postCapabilities({
      playableMediaTypes: [BaseItemKind[BaseItemKind.Audio]],
      supportsMediaControl: true,
      supportedCommands: [
        GeneralCommandType.Play,
        GeneralCommandType.PlayState,
      ],
    });

    this.logger.debug('Reported playback capabilities sucessfully');
  }

  @OnEvent('internal.audio.track.announce')
  private async onPlaybackNewTrack(track: Track) {
    this.logger.debug(`Reporting playback start on track '${track.id}'`);
    await this.playstateApi.reportPlaybackStart({
      playbackStartInfo: {
        ItemId: track.id,
        PositionTicks: 0,
      },
    });
  }

  @OnEvent('internal.audio.track.finish')
  private async onPlaybackFinished(track: Track) {
    if (!track) {
      this.logger.error(
        'Unable to report playback because finished track was undefined',
      );
      return;
    }
    this.logger.debug(`Reporting playback finish on track '${track.id}'`);
    await this.playstateApi.reportPlaybackStopped({
      playbackStopInfo: {
        ItemId: track.id,
        PositionTicks: track.playbackProgress * 10000,
      },
    });
  }

  @OnEvent('playback.state.pause')
  private async onPlaybackPause(paused: boolean) {
    const track = this.playbackService.getPlaylistOrDefault().getActiveTrack();

    if (!track) {
      this.logger.error(
        'Unable to report changed playstate to Jellyfin because no track was active',
      );
      return;
    }

    this.playstateApi.reportPlaybackProgress({
      playbackProgressInfo: {
        IsPaused: paused,
        ItemId: track.id,
        PositionTicks: track.playbackProgress * 10000,
      },
    });
  }

  @Interval(1000)
  private async onPlaybackProgress() {
    const track = this.playbackService.getPlaylistOrDefault().getActiveTrack();

    if (!track) {
      return;
    }

    await this.playstateApi.reportPlaybackProgress({
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
