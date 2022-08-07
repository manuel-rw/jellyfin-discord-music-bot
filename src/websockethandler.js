const jellyfinClientManager = require("./jellyfinclientmanager");
const playbackmanager = require("./playbackmanager");
const { ticksToSeconds } = require("./util");

function openSocket() {
	jellyfinClientManager.getJellyfinClient().openWebSocket();
	jellyfinClientManager.getJellyfinClient().reportCapabilities({
		PlayableMediaTypes: "Audio",
		SupportsMediaControl: true,
		SupportedCommands: "SetRepeatMode,Play,Playstate",
	});
	jellyfinClientManager
		.getJellyfinEvents()
		.on(jellyfinClientManager.getJellyfinClient(), "message", (type, data) => {
			if (data.MessageType === "Play") {
				if (data.Data.PlayCommand === "PlayNow") {
					playbackmanager.startPlaying(
						undefined,
						data.Data.ItemIds,
						data.Data.StartIndex || 0,
						0,
						false
					);
				}
			} else if (data.MessageType === "Playstate") {
				if (data.Data.Command === "PlayPause") {
					playbackmanager.playPause();
				} else if (data.Data.Command === "Stop") {
					playbackmanager.stop();
				} else if (data.Data.Command === "Seek") {
					// because the server sends seek an privious track at same time so i have to do timing
					setTimeout(async () => {
						playbackmanager.seek(data.Data.SeekPositionTicks);
					}, 20);
				} else if (data.Data.Command === "NextTrack") {
					try {
						playbackmanager.nextTrack();
					} catch (error) {
						console.error(error);
					}
				} else if (data.Data.Command === "PreviousTrack") {
					try {
						if (ticksToSeconds(playbackmanager.getPostitionTicks()) < 10) {
							playbackmanager.previousTrack();
						}
					} catch (error) {
						console.error(error);
					}
				}
			}
		});
}

module.exports = {
	openSocket,
};
