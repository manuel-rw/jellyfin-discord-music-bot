import { Module } from '@nestjs/common';
import { RadioService } from './radio.service';
import { JellyfinClientModule } from 'src/clients/jellyfin/jellyfin.module';
import { PlaybackModule } from 'src/playback/playback.module';

@Module({
  imports: [JellyfinClientModule, PlaybackModule],
  controllers: [],
  providers: [RadioService],
  exports: [RadioService],
})
export class RadioModule {}
