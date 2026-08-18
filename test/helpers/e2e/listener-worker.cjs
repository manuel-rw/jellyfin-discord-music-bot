/**
 * Standalone listener process for the e2e audio tests.
 *
 * It MUST run in its own process: `@discordjs/voice` keeps voice connections in
 * a process-global store keyed by guildId, so a second client in the same
 * process would reuse the first's connection and never receive audio. The
 * parent `DiscordListener` controls this worker over IPC.
 */
'use strict';

const { Client, GatewayIntentBits } = require('discord.js');
const {
  EndBehaviorType,
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel,
} = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

const token = process.env.E2E_LISTENER_TOKEN;
const outDir = process.env.OUT_DIR;

if (!token || !outDir) {
  // eslint-disable-next-line no-console
  console.error('WORKER_ERR missing env');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

let connection = null;
let recordingTimer = null;

function report(entry) {
  if (process.send) process.send(entry);
}

client.on('voiceStateUpdate', (_oldState, newState) => {
  report({ type: 'inChannel', userId: newState.id, channelId: newState.channelId });
});

async function join(guildId, channelId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    throw new Error(`Listener is not a member of guild ${guildId}`);
  }
  const channel = await guild.channels.fetch(channelId);
  if (!channel || channel.type !== 2 /* GuildVoice */) {
    throw new Error(`No voice channel with id ${channelId} in guild ${guildId}`);
  }

  connection = joinVoiceChannel({
    guildId,
    channelId,
    adapterCreator: guild.voiceAdapterCreator,
    // Being deafened prevents Discord from forwarding others' audio.
    selfDeaf: false,
    selfMute: true,
  });

  await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  report({ type: 'joined' });
}

function startRecording(userId, inactivityMs, maxDurationMs) {
  if (!connection) {
    report({ type: 'error', message: 'listener has no voice connection' });
    return;
  }

  const file = path.join(outDir, `frames-${Date.now()}.bin`);
  const out = fs.createWriteStream(file);
  let frames = 0;
  let bytes = 0;
  let finished = false;

  const stream = connection.receiver.subscribe(userId, {
    end: { behavior: EndBehaviorType.AfterInactivity, duration: inactivityMs },
  });

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(recordingTimer);
    recordingTimer = null;
    try {
      stream.destroy();
    } catch {
      // ignore
    }
    out.end(() => {
      report({ type: 'recordingDone', file, frames, bytes });
    });
  };

  recordingTimer = setTimeout(finish, maxDurationMs);

  stream.on('data', (chunk) => {
    const buf = Buffer.from(chunk);
    const header = Buffer.alloc(4);
    header.writeUInt32LE(buf.length, 0);
    try {
      out.write(header);
      out.write(buf);
    } catch {
      // ignore write errors
    }
    frames += 1;
    bytes += buf.length;
  });
  stream.once('end', finish);
  stream.once('close', finish);
}

async function main() {
  client.on('error', (e) => report({ type: 'log', level: 'warn', message: e.message }));
  await client.login(token);
  report({ type: 'ready', tag: client.user ? client.user.tag : '?' });
  report({ type: 'loggedIn' });
}

process.on('message', async (msg) => {
  try {
    switch (msg.type) {
      case 'join':
        await join(msg.guildId, msg.channelId);
        break;
      case 'record':
        startRecording(msg.userId, msg.inactivityMs, msg.maxDurationMs);
        report({ type: 'recordingStarted' });
        break;
      case 'shutdown':
        await shutdown();
        break;
      default:
        report({ type: 'log', level: 'warn', message: `unknown msg ${msg.type}` });
    }
  } catch (e) {
    report({ type: 'error', message: e.message });
  }
});

/** Leaves the voice channel and closes the Discord session before exiting. */
async function shutdown() {
  try {
    if (connection) {
      connection.destroy();
      connection = null;
    }
  } catch {
    // ignore
  }
  try {
    await client.destroy();
  } catch {
    // ignore
  }
  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('WORKER_FATAL', e);
  report({ type: 'error', message: e.message });
  process.exit(1);
});