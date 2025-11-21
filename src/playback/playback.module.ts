import { Module } from '@nestjs/common';
import { PlaybackService } from './playback.service';

@Module({
  imports: [],
  controllers: [],
  providers: [PlaybackService],
  exports: [PlaybackService],
})
export class PlaybackModule {} // skipcq: JS-0327
