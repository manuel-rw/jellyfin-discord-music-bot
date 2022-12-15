import { Module, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { JellyfinService } from "./jellyfin.service";

@Module({
  imports: [],
  controllers: [],
  providers: [JellyfinService],
  exports: [],
})
export class JellyfinClientModule implements OnModuleInit, OnModuleDestroy {
  
  constructor(private jellyfinService: JellyfinService) {}
  
  onModuleDestroy() {
    this.jellyfinService.destroy();
  }

  onModuleInit() {
    this.jellyfinService.init();
    this.jellyfinService.authenticate();
  }
}