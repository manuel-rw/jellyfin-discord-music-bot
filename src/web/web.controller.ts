import { Controller, Get, Post, Param, Body, Res, Logger } from '@nestjs/common';
import { InjectDiscordClient } from '@discord-nestjs/core';
import { Client, Status } from 'discord.js';
import { Response } from 'express';
import { DiscordVoiceService } from '../clients/discord/discord.voice.service';
import { PlaybackService } from '../playback/playback.service';
import { JellyfinService } from '../clients/jellyfin/jellyfin.service';
import { JellyfinStreamBuilderService } from '../clients/jellyfin/jellyfin.stream.builder.service';

@Controller('api/web')
export class WebController {
  private readonly logger = new Logger(WebController.name);

  constructor(
    @InjectDiscordClient() private readonly discordClient: Client,
    private readonly discordVoice: DiscordVoiceService,
    private readonly playbackService: PlaybackService,
    private readonly jellyfinService: JellyfinService,
    private readonly streamBuilder: JellyfinStreamBuilderService,
  ) {}

  @Get('status')
  getStatus() {
    const playlist = this.playbackService.getPlaylistOrDefault();
    const activeTrack = playlist.getActiveTrack();
    const voiceConnection = this.discordVoice.getVoiceConnection();
    const paused = voiceConnection && this.discordVoice.isPaused();
    const channelInfo = this.discordVoice.getVoiceChannelInfo();
    const discordConnected = this.discordClient.ws.status === Status.Ready;

    return {
      discordConnected,
      jellyfinConnected: this.jellyfinService.isConnected(),
      voiceConnection: voiceConnection
        ? { connected: true, channel: channelInfo?.name, bitrate: channelInfo?.bitrate }
        : { connected: false },
      paused,
      volume: this.playbackService.getVolume(),
      activeTrack: activeTrack
        ? {
            id: activeTrack.id,
            name: activeTrack.name,
            duration: activeTrack.duration,
            playbackProgress: activeTrack.playbackProgress,
            playing: activeTrack.playing,
            images: activeTrack.getRemoteImages(),
          }
        : null,
      queueLength: playlist.getLength(),
      queuePosition: playlist.activeTrackIndex,
    };
  }

  @Post('pause')
  togglePause() {
    this.discordVoice.togglePaused();
    return { paused: this.discordVoice.isPaused() };
  }

  @Post('stop')
  stop() {
    this.discordVoice.stop(true);
    return { stopped: true };
  }

  @Post('next')
  nextTrack() {
    this.playbackService.getPlaylistOrDefault().setNextTrackAsActiveTrack();
    return { ok: true };
  }

  @Post('previous')
  previousTrack() {
    this.playbackService.getPlaylistOrDefault().setPreviousTrackAsActiveTrack();
    return { ok: true };
  }

  @Post('volume')
  setVolume(@Body() body: { volume: number }) {
    const vol = Math.max(0, Math.min(1, body.volume));
    this.playbackService.setVolume(vol);
    this.discordVoice.changeCurrentResourceVolume(vol);
    return { volume: vol };
  }

  @Post('disconnect')
  disconnect() {
    this.playbackService.getPlaylistOrDefault().clear();
    this.discordVoice.disconnect();
    return { disconnected: true };
  }

  @Get('album-art/:itemId')
  async proxyAlbumArt(
    @Param('itemId') itemId: string,
    @Res() res: Response,
  ) {
    try {
      const api = this.jellyfinService.getApi();
      const url = `${api.basePath}/Items/${itemId}/Images/Primary?api_key=${api.accessToken}`;
      const response = await fetch(url);
      if (!response.ok) {
        res.status(404).end();
        return;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType =
        response.headers.get('content-type') ?? 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(buffer);
    } catch (err) {
      this.logger.error(`Failed to proxy album art: ${err}`);
      res.status(500).end();
    }
  }
}