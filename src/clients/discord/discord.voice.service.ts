import { getVoiceConnections } from '@discordjs/voice';
import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common/services';

@Injectable()
export class DiscordVoiceService {
  private readonly logger = new Logger(DiscordVoiceService.name);
  disconnectGracefully() {
    const connections = getVoiceConnections();
    this.logger.debug(
      `Disonnecting gracefully from ${
        Object.keys(connections).length
      } connections`,
    );

    connections.forEach((connection) => {
      connection.destroy();
    });
  }
}
