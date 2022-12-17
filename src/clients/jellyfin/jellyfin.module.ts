import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JellyfinSearchService } from './jellyfin.search.service';
import { JellyfinService } from './jellyfin.service';
import { JellyfinStreamBuilderService } from './jellyfin.stream.builder.service';
import { JellyinWebsocketService } from './jellyfin.websocket.service';

@Module({
  imports: [],
  controllers: [],
  providers: [
    JellyfinService,
    JellyinWebsocketService,
    JellyfinSearchService,
    JellyfinStreamBuilderService,
  ],
  exports: [
    JellyfinService,
    JellyfinSearchService,
    JellyfinStreamBuilderService,
  ],
})
export class JellyfinClientModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private jellyfinService: JellyfinService,
    private readonly jellyfinWebsocketService: JellyinWebsocketService,
  ) {}

  onModuleDestroy() {
    this.jellyfinService.destroy();
  }

  onModuleInit() {
    this.jellyfinService.init();
    this.jellyfinService.authenticate();

    setTimeout(() => {
      this.jellyfinWebsocketService.openSocket();
    }, 5000);
  }
}
