let paused = false;

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtBitrate(bps) {
  return bps >= 1000000 ? `${(bps / 1000000).toFixed(1)} Mbps` : `${Math.round(bps / 1000)} kbps`;
}

async function fetchStatus() {
  try {
    const res = await fetch('/api/web/status');
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch {
    return null;
  }
}

async function updateUI() {
  const status = await fetchStatus();

  const jellyfinDot = document.getElementById('jellyfinDot');
  const discordDot = document.getElementById('discordDot');
  const voiceInfo = document.getElementById('voiceInfo');
  const artwork = document.getElementById('albumArt');
  const icon = document.getElementById('defaultIcon');
  const trackName = document.getElementById('trackName');
  const trackStatus = document.getElementById('trackStatus');
  const progressFill = document.getElementById('progressFill');
  const queueInfo = document.getElementById('queueInfo');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const volSlider = document.getElementById('volumeSlider');

  if (!status) {
    jellyfinDot.className = 'inline-block w-2.5 h-2.5 rounded-full bg-gray-500';
    discordDot.className = 'inline-block w-2.5 h-2.5 rounded-full bg-gray-500';
    voiceInfo.textContent = '';
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
      voiceInfo.textContent = `${status.voiceConnection.channel} \u00B7 ${fmtBitrate(status.voiceConnection.bitrate)}`;
    } else if (status.voiceConnection.channel) {
      voiceInfo.textContent = status.voiceConnection.channel;
    } else {
      voiceInfo.textContent = 'In voice channel';
    }
    voiceInfo.className = 'text-gray-400 text-xs';
  } else {
    voiceInfo.textContent = '';
  }

  if (status.activeTrack) {
    trackName.textContent = status.activeTrack.name;
    const pos = status.activeTrack.playbackProgress || 0;
    const dur = status.activeTrack.duration || 1;
    const pct = Math.min(100, (pos / dur) * 100);
    progressFill.style.width = pct + '%';
    trackStatus.textContent = `${fmt(pos)} / ${fmt(dur)}`;

    const images = status.activeTrack.images || [];
    const primary = images.find(i => i.ImageType === 'Primary');
    if (primary && primary.Url) {
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
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  } else {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  }

  if (status.volume !== undefined && volSlider.value !== String(status.volume)) {
    volSlider.value = status.volume;
  }

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

updateUI();
setInterval(updateUI, 2000);