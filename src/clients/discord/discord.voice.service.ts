import { Injectable } from "@nestjs/common";
import { VoiceChannel } from "discord.js";

@Injectable()
export class DiscordVoiceService {
  
  summonClient(voiceChannel: VoiceChannel) {
    // voiceChannel.join('');
  }

  startPlayback() {

  }
}