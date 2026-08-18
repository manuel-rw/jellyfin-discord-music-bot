/**
 * Configuration for the Discord e2e tests.
 *
 * Requires a real guild, a voice channel and two bot tokens (the bot under test
 * and the "listener" that hears playback). The suite is skipped when missing
 * so unit tests and CI are unaffected.
 */
import { config as loadDotenv } from 'dotenv';

// Load a local `.env` if present; does not override CI-provided variables.
loadDotenv();

export interface E2eConfig {
  botToken: string;
  listenerToken: string;
  guildId: string;
  voiceChannelId: string;
}

/** The Nest injection token exposing the discord.js `Client`. */
export const DISCORD_CLIENT_INJECTION_TOKEN = '__inject_discord_client__';

export function loadE2eConfig(): E2eConfig {
  return {
    botToken: process.env.DISCORD_CLIENT_TOKEN ?? '',
    listenerToken: process.env.E2E_LISTENER_TOKEN ?? '',
    guildId: process.env.E2E_DISCORD_GUILD_ID ?? '',
    voiceChannelId: process.env.E2E_DISCORD_VOICE_CHANNEL_ID ?? '',
  };
}

export function isE2eConfigured(config: E2eConfig = loadE2eConfig()): boolean {
  return Boolean(
    config.botToken &&
    config.listenerToken &&
    config.guildId &&
    config.voiceChannelId,
  );
}

export function e2eConfigError(config: E2eConfig = loadE2eConfig()): string {
  const missing = [
    !config.botToken && 'DISCORD_CLIENT_TOKEN',
    !config.listenerToken && 'E2E_LISTENER_TOKEN',
    !config.guildId && 'E2E_DISCORD_GUILD_ID',
    !config.voiceChannelId && 'E2E_DISCORD_VOICE_CHANNEL_ID',
  ].filter(Boolean);

  return `Discord e2e tests were skipped. Missing environment variables: ${missing.join(
    ', ',
  )}. See test/README.md for setup instructions.`;
}
