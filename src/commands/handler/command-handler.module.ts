import { Module } from '@nestjs/common';
import { DiscordClientModule } from '../../clients/discord/discord.module';
import { CommandHandlerService } from './command-handler.service';

@Module({
  imports: [DiscordClientModule],
  controllers: [],
  providers: [CommandHandlerService],
})
export class CommandHandlerModule {}
