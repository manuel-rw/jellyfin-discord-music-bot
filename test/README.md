# Tests

## Unit tests

Run with `pnpm test` (or `pnpm test:watch`). These run in CI.

## End-to-end tests

The e2e tests in this directory exercise real Discord connections:

- **Discord connection** – the bot under test logs into Discord with a real bot
  token and joins a real voice channel. A second bot (the listener) joins the
  same channel and confirms it can see the bot.
- **Audio playback** – the bot plays a generated reference signal over the voice
  channel. The listener records the Opus packets that Discord relays, decodes
  them to PCM and compares them against the reference. The mock Jellyfin server
  serves the signal as Ogg/Opus, and `@discordjs/voice` transcodes it via ffmpeg
  into the Opus stream played over Discord.

The bot under test is driven through the app's real `DiscordVoiceService`
(`test/helpers/e2e/bot-app.ts`). The full `AppModule` is intentionally **not**
booted: `@discord-nestjs/core` deadlocks during `app.init()` when run inside a
vitest harness (its `initSubject` never emits, so the boot stalls *before* the
Discord login — reproducing locally and in CI regardless of credentials). The
live voice pipeline (`joinVoiceChannel` → `AudioPlayer` → Opus over Discord) is
therefore exercised directly, which is exactly what these tests are for.

The listener runs in its **own child process** (`listener-worker.cjs`).
`@discordjs/voice` keeps voice connections in a process-global store keyed by
`guildId`, so a second client in the same process would silently reuse the
first bot's connection (never truly joining or receiving audio). A separate
process gives the listener its own independent voice stack, exactly like two
real Discord clients.

Because audio is never lossless (Opus at a reduced bitrate over a network
relay), the audio comparison is deliberately **lenient**. It does **not** do an
exact byte-for-byte check. Instead it verifies, within configurable tolerances,
that:

- the received audio is the *same content* (normalised cross-correlation),
- there is no significant residual error / distortion,
- there are no "clicks" (sparse distortion spikes),
- sections that should be audible were not dropped to silence.

See `test/helpers/e2e/audio-analysis.ts` for the exact metrics and their default
thresholds.

### Requirements

Running the e2e suite requires a real Discord guild, a voice channel and **two
bot accounts**:

| Variable                     | Purpose                                        |
| ---------------------------- | ---------------------------------------------- |
| `DISCORD_CLIENT_TOKEN`       | The bot under test (already used by the app).  |
| `E2E_LISTENER_TOKEN`         | A second bot that "hears" the playback.        |
| `E2E_DISCORD_GUILD_ID`       | A guild both bots can join.                    |
| `E2E_DISCORD_VOICE_CHANNEL_ID` | A voice channel in that guild.               |

Both bots must be invited to the guild and have permission to connect + speak in
the voice channel. The bot under test also needs `ffmpeg` available on `PATH`
(it is used by `@discordjs/voice` to decode the audio stream), which the
Docker image already provides. The `ubuntu-latest` GitHub runners ship `ffmpeg`
preinstalled.

### Troubleshooting

The live tests should fail fast (< ~50s) with an actionable message. If the bots
do not come online or the suite hangs, check in this order:

1. **Tokens** – both must be real bot tokens (from the Discord Developer Portal
   → Application → Bot → Token). `DISCORD_CLIENT_TOKEN` and `E2E_LISTENER_TOKEN`
   must be **two different bots** (one bot cannot observe its own voice output).
   Do not reuse one token for both.
2. **Invite** – both bots must be invited to the guild (`E2E_DISCORD_GUILD_ID`)
   with the `View Channels`, `Connect`, `Speak` and `Send/Messages` permissions.
3. **Intents** – no privileged intents are required for the tests. The test
   clients only use the non-privileged `Guilds` and `GuildVoiceStates` intents,
   so you do **not** need to enable `MessageContent`/`GuildMembers` in the
   Developer Portal for either bot. (If you also run the real application with
   the same bot, the app itself requests `MessageContent`, which *is*
   privileged and must be enabled for that bot; it is unrelated to the tests.)
4. **Already connected** – if the same bot token is already online elsewhere
   (e.g. a running dev instance), Discord can block or delay the new session.
5. **Environment** – confirm the secrets are set in the repository's
   *Settings → Secrets and variables → Actions* page (Repository secrets) and
   that the workflow passes them (see `.github/workflows/e2e-tests.yml`).

### Running

```bash
E2E_LISTENER_TOKEN="..." \
E2E_DISCORD_GUILD_ID="..." \
E2E_DISCORD_VOICE_CHANNEL_ID="..." \
pnpm test:e2e
```

`DISCORD_CLIENT_TOKEN`, `JELLYFIN_SERVER_ADDRESS`, `JELLYFIN_AUTHENTICATION_USERNAME`
and `JELLYFIN_AUTHENTICATION_PASSWORD` are also read from `.env` / the
environment. The e2e tests point the bot at an in-memory mock Jellyfin server,
so no real Jellyfin instance is required.

If any of the `E2E_*` variables (or `DISCORD_CLIENT_TOKEN`) are missing the
suite is skipped with a warning, so normal CI runs are unaffected.

> **Note:** the audio test takes a few seconds (it plays ~6s of audio over a
> real network). It is intentionally not run in CI unless credentials are
> supplied. The `e2e-tests` GitHub Actions workflow does run `pnpm test:e2e` on
> every push/PR – the web API e2e tests (which need no credentials) execute
> there, while the live Discord checks skip. To enable the live Discord checks
> on a self-hosted/scheduled run, set `E2E_LISTENER_TOKEN`,
> `E2E_DISCORD_GUILD_ID` and `E2E_DISCORD_VOICE_CHANNEL_ID` as repository
> secrets (see `.github/workflows/e2e-tests.yml`).