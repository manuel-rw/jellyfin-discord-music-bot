let paused = false;

function formatMilliseconds(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatBitrate(bps) {
  return bps >= 1000000 ? `${(bps / 1000000).toFixed(1)} Mbps` : `${Math.round(bps / 1000)} kbps`;
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

async function fetchStatus() {
  try {
    return await fetchJSON('/api/web/status');
  } catch {
    return null;
  }
}

async function updateUI() {
  const status = await fetchStatus();

  const jellyfinDot = document.getElementById('jellyfinDot');
  const discordDot = document.getElementById('discordDot');
  const voiceInfo = document.getElementById('voiceInfo');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const artwork = document.getElementById('albumArt');
  const icon = document.getElementById('defaultIcon');
  const trackName = document.getElementById('trackName');
  const trackStatus = document.getElementById('trackStatus');
  const progressFill = document.getElementById('progressFill');
  const queueInfo = document.getElementById('queueInfo');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const volSlider = document.getElementById('volumeSlider');
  const playBtn = document.getElementById('playBtn');
  const stopBtn = document.getElementById('stopBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (!status) {
    jellyfinDot.className = 'inline-block w-2.5 h-2.5 rounded-full bg-gray-500';
    discordDot.className = 'inline-block w-2.5 h-2.5 rounded-full bg-gray-500';
    voiceInfo.textContent = '';
    disconnectBtn.classList.add('hidden');
    return;
  }

  jellyfinDot.className = status.jellyfinConnected
    ? 'inline-block w-2.5 h-2.5 rounded-full bg-green-500'
    : 'inline-block w-2.5 h-2.5 rounded-full bg-red-500';

  discordDot.className = status.discordConnected
    ? 'inline-block w-2.5 h-2.5 rounded-full bg-green-500'
    : 'inline-block w-2.5 h-2.5 rounded-full bg-red-500';

  if (status.voiceConnection?.connected) {
    if (status.voiceConnection.channel && status.voiceConnection.bitrate) {
      voiceInfo.textContent = `Connected to '${status.voiceConnection.channel}' \u00B7 ${formatBitrate(status.voiceConnection.bitrate)}`;
    } else if (status.voiceConnection.channel) {
      voiceInfo.textContent = `Connected to '${status.voiceConnection.channel}'`;
    } else {
      voiceInfo.textContent = 'Connected to a voice channel';
    }
    disconnectBtn.classList.remove('hidden');
  } else {
    voiceInfo.textContent = '';
    disconnectBtn.classList.add('hidden');
  }

  if (status.activeTrack) {
    trackName.textContent = status.activeTrack.name;
    const pos = status.activeTrack.playbackProgress || 0;
    const dur = status.activeTrack.duration || 1;
    const pct = Math.min(100, (pos / dur) * 100);
    progressFill.style.width = `${pct}%` ;
    trackStatus.textContent = `${formatMilliseconds(pos)} / ${formatMilliseconds(dur)}`;

    const images = status.activeTrack.images || [];
    const primary = images.find(i => i.ImageType === 'Primary');
    if (primary?.Url) {
      artwork.src = primary.Url;
      artwork.classList.remove('hidden');
      icon.classList.add('hidden');
    } else {
      artwork.src = `/api/web/album-art/${status.activeTrack.id}`;
      artwork.onerror = () => {
        artwork.classList.add('hidden');
        icon.classList.remove('hidden');
      };
      artwork.classList.remove('hidden');
      icon.classList.add('hidden');
    }
  } else {
    trackName.textContent = 'No active track';
    trackStatus.textContent = 'Add tracks via Discord';
    progressFill.style.width = '0%';
    artwork.classList.add('hidden');
    icon.classList.remove('hidden');
  }

  paused = status.paused;
  if (paused) {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  } else {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  }

  if (status.volume !== undefined && volSlider.value !== String(status.volume)) {
    volSlider.value = status.volume;
  }

  const hasTrack = Boolean(status.activeTrack);
  [playBtn, stopBtn, prevBtn, nextBtn].forEach(btn => {
    if (hasTrack) {
      btn.disabled = false;
      btn.classList.remove('opacity-40', 'cursor-not-allowed');
    } else {
      btn.disabled = true;
      btn.classList.add('opacity-40', 'cursor-not-allowed');
    }
  });
  volSlider.disabled = !hasTrack;
  volSlider.classList.toggle('opacity-40', !hasTrack);
  volSlider.classList.toggle('cursor-not-allowed', !hasTrack);

  queueInfo.textContent = status.activeTrack
    ? `Track ${(status.queuePosition ?? 0) + 1} of ${status.queueLength}`
    : `Queue: ${status.queueLength} track${status.queueLength !== 1 ? 's' : ''}`;
}

async function togglePause() {
  await fetch('/api/web/pause', { method: 'POST' });
  await updateUI();
}

async function stop() {
  await fetch('/api/web/stop', { method: 'POST' });
  await updateUI();
}

async function next() {
  await fetch('/api/web/next', { method: 'POST' });
  await updateUI();
}

async function previous() {
  await fetch('/api/web/previous', { method: 'POST' });
  await updateUI();
}

async function setVolume(value) {
  await fetch('/api/web/volume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ volume: parseFloat(value) }),
  });
}

async function disconnect() {
  await fetchJSON('/api/web/disconnect', { method: 'POST' });
  await updateUI();
}

async function loadGuilds() {
  try {
    const guilds = await fetchJSON('/api/web/guilds');
    const select = document.getElementById('guildSelect');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select a server</option>';
    guilds.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      select.appendChild(opt);
    });
    if (currentValue && guilds.some(g => g.id === currentValue)) {
      select.value = currentValue;
    }
  } catch {
    // ignore
  }
}

async function onGuildChange() {
  const guildId = document.getElementById('guildSelect').value;
  const section = document.getElementById('channelSection');
  const list = document.getElementById('channelList');

  if (!guildId) {
    section.classList.add('hidden');
    return;
  }

  try {
    const channels = await fetchJSON(`/api/web/guilds/${guildId}/channels`);
    list.innerHTML = '';
    if (channels.length === 0) {
      list.innerHTML = '<div class="text-gray-500 text-xs">No voice channels found</div>';
    } else {
      channels.forEach(c => {
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between bg-zinc-700/50 rounded-lg px-3 py-2';
        row.innerHTML = `<span class="text-gray-300 text-sm">${c.name}</span>
          <button class="text-xs text-purple-400 hover:text-purple-300 border border-purple-400/30 hover:border-purple-300/50 rounded-lg px-3 py-1 transition" onclick="joinChannel('${guildId}','${c.id}')">Join</button>`;
        list.appendChild(row);
      });
    }
    section.classList.remove('hidden');
  } catch {
    section.classList.add('hidden');
  }
}

async function joinChannel(guildId, channelId) {
  await fetchJSON('/api/web/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guildId, channelId }),
  });
  await updateUI();
}

updateUI();
setInterval(updateUI, 2000);
loadGuilds();