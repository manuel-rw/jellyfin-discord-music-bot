import { Module, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { DiscordService } from "./discord.service";

@Module({
  imports: [],
  controllers: [],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordClientModule implements OnModuleInit, OnModuleDestroy {
  
  constructor(private discordService: DiscordService) {}
  onModuleDestroy() {
    this.discordService.destroyClient();
  }

  onModuleInit() {
    this.discordService.initializeClient();
    this.discordService.registerEventHandlers();
    this.discordService.connectAndLogin();
  }
}