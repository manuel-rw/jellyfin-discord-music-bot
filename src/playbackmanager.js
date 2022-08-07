const interactivemsghandler = require("./interactivemsghandler");
const CONFIG = require("../config.json");
const discordclientmanager = require("./discordclientmanager");
const log = require("loglevel");

const {
	getAudioDispatcher,
	setAudioDispatcher
} = require("./dispachermanager");
const { ticksToSeconds } = require("./util");

// this whole thing should be a class but its probably too late now.

var currentPlayingPlaylist;
var currentPlayingPlaylistIndex;
var isPaused;
var isRepeat;
var _disconnectOnFinish;
var _seek;

const jellyfinClientManager = require("./jellyfinclientmanager");
const { VoiceConnection } = require("discord.js");

function streamURLbuilder(itemID, bitrate) {
	// so the server transcodes. Seems appropriate as it has the source file.(doesnt yet work i dont know why)
	const supportedCodecs = "opus";
	const supportedContainers = "ogg,opus";
	return `${jellyfinClientManager
		.getJellyfinClient()
		.serverAddress()}/Audio/${itemID}/universal?UserId=${jellyfinClientManager
		.getJellyfinClient()
		.getCurrentUserId()}&DeviceId=${jellyfinClientManager
		.getJellyfinClient()
		.deviceId()}&MaxStreamingBitrate=${bitrate}&Container=${supportedContainers}&AudioCodec=${supportedCodecs}&api_key=${jellyfinClientManager
		.getJellyfinClient()
		.accessToken()}&TranscodingContainer=ts&TranscodingProtocol=hls`;
}

function startPlaying(
	voiceconnection = discordclientmanager
		.getDiscordClient()
		.user.client.voice.connections.first(),
	itemIDPlaylist = currentPlayingPlaylist,
	playlistIndex = currentPlayingPlaylistIndex,
	seekTo,
	disconnectOnFinish = _disconnectOnFinish
) {
	log.debug(
		"Start playing",
		itemIDPlaylist[playlistIndex],
		"with index",
		playlistIndex,
		"of list with length of",
		itemIDPlaylist.length,
		"in",
		voiceconnection && voiceconnection.channel
			? '"' +
					voiceconnection.channel.name +
					'" (' +
					voiceconnection.channel.id +
					")"
			: "an unknown voice channel"
	);

	isPaused = false;
	currentPlayingPlaylist = itemIDPlaylist;
	currentPlayingPlaylistIndex = playlistIndex;
	_disconnectOnFinish = disconnectOnFinish;
	_seek = seekTo * 1000;
	updatePlayMessage();

	async function playasync() {
		const url = streamURLbuilder(
			itemIDPlaylist[playlistIndex],
			voiceconnection.channel.bitrate
		);
		setAudioDispatcher(
			voiceconnection.play(url, {
				seek: seekTo
			})
		);
		if (seekTo) {
			jellyfinClientManager
				.getJellyfinClient()
				.reportPlaybackProgress(getProgressPayload());
		} else {
			jellyfinClientManager.getJellyfinClient().reportPlaybackStart({
				userID: `${jellyfinClientManager.getJellyfinClient().getCurrentUserId()}`,
				itemID: `${itemIDPlaylist[playlistIndex]}`,
				canSeek: true,
				playSessionId: getPlaySessionId(),
				playMethod: getPlayMethod()
			});
		}

		getAudioDispatcher().on("finish", () => {
			// report playback stop and start the same index again
			if (isRepeat) {
				reportPlaybackStoppedAndStartPlaying(
					voiceconnection,
					currentPlayingPlaylistIndex
				);
				return;
			}

			if (currentPlayingPlaylist.length < playlistIndex) {
				if (disconnectOnFinish) {
					stop(voiceconnection, currentPlayingPlaylist[playlistIndex - 1]);
					return;
				}

				stop(undefined, currentPlayingPlaylist[playlistIndex - 1]);
				return;
			}

			// play the next song in the playlist
			reportPlaybackStoppedAndStartPlaying(
				voiceconnection,
				currentPlayingPlaylistIndex + 1
			);
		});
	}
	playasync().catch((rsn) => {
		console.error(rsn);
	});
}

/**
 *
 * @param {VoiceConnection} voiceconnection - The voiceConnection where the bot should play
 * @param {number} playlistIndex - The target playlist index
 * @param {any} disconnectOnFinish
 */
const reportPlaybackStoppedAndStartPlaying = (
	voiceconnection,
	playlistIndex,
	disconnectOnFinish
) => {
	const stopPayload = getStopPayload();

	log.debug(
		"Repeat and sending following payload as reportPlaybackStopped to the server: ",
		stopPayload
	);

	jellyfinClientManager.getJellyfinClient().reportPlaybackStopped(stopPayload);
	startPlaying(voiceconnection, undefined, playlistIndex, 0, disconnectOnFinish);
};

async function spawnPlayMessage(message) {
	if (!message.channel) {
		log.error("Unable to send play message in channel");
		log.debug(message);
		return;
	}

	log.debug(
		"Sending play message to channel",
		message.channel.name,
		"(" + message.channel.id + ")"
	);

	const itemIdDetails = await jellyfinClientManager
		.getJellyfinClient()
		.getItem(
			jellyfinClientManager.getJellyfinClient().getCurrentUserId(),
			getItemId()
		);
	const imageURL = await jellyfinClientManager
		.getJellyfinClient()
		.getImageUrl(itemIdDetails.AlbumId || getItemId(), { type: "Primary" });
	try {
		interactivemsghandler.init(
			message,
			itemIdDetails.Name,
			itemIdDetails.Artists[0] || "VA",
			imageURL,
			`${jellyfinClientManager
				.getJellyfinClient()
				.serverAddress()}/web/index.html#!/details?id=${itemIdDetails.AlbumId}`,
			itemIdDetails.RunTimeTicks,
			ticksToSeconds(getPostitionTicks()) > 10 ? previousTrack : seek,
			playPause,
			() => {
				stop(
					_disconnectOnFinish
						? discordclientmanager
								.getDiscordClient()
								.user.client.voice.connections.first()
						: undefined
				);
			},
			nextTrack,
			() => {
				setIsRepeat(!isRepeat);
			},
			currentPlayingPlaylist.length
		);
		if (typeof CONFIG["interactive-seek-bar-update-intervall"] === "number") {
			interactivemsghandler.startUpate(getPostitionTicks);
		}
	} catch (error) {
		log.error(error);
	}
}

async function updatePlayMessage() {
	const itemId = getItemId();

	if (!itemId) {
		return;
	}

	const jellyfinItemDetails = await jellyfinClientManager
		.getJellyfinClient()
		.getItem(
			jellyfinClientManager.getJellyfinClient().getCurrentUserId(),
			getItemId()
		);

	const primaryAlbumCover = await jellyfinClientManager
		.getJellyfinClient()
		.getImageUrl(jellyfinItemDetails.AlbumId || itemId, { type: "Primary" });

	log.debug("Extracted primary Album cover url:", primaryAlbumCover);

	try {
		interactivemsghandler.updateCurrentSongMessage(
			jellyfinItemDetails.Name,
			jellyfinItemDetails.Artists[0] || "VA",
			primaryAlbumCover,
			`${jellyfinClientManager
				.getJellyfinClient()
				.serverAddress()}/web/index.html#!/details?id=${
				jellyfinItemDetails.AlbumId
			}`,
			jellyfinItemDetails.RunTimeTicks,
			currentPlayingPlaylistIndex + 1,
			currentPlayingPlaylist.length
		);
	} catch (exception) {
		log.error("Exception during updating the current song message:", exception);
	}
}

/**
 * @param {Number} toSeek - where to seek in ticks
 */
function seek(toSeek = 0) {
	log.debug("Seeking to: ", toSeek);

	if (!getAudioDispatcher()) {
		log.warn("Failed to seek because no song is playing.");
	}

	// start playing the same track but with a specified time
	startPlaying(
		undefined,
		undefined,
		undefined,
		ticksToSeconds(toSeek),
		_disconnectOnFinish
	);

	// report change about playback progress to Jellyfin
	jellyfinClientManager
		.getJellyfinClient()
		.reportPlaybackProgress(getProgressPayload());
}
/**
 *
 * @param {Array} trackItemIdsArray - array of itemIDs to be added
 */
function addTracks(trackItemIdsArray) {
	currentPlayingPlaylist = currentPlayingPlaylist.concat(trackItemIdsArray);
	log.debug(
		"Added tracks of",
		trackItemIdsArray.length,
		"to the current playlist"
	);
}

function nextTrack() {
	log.debug("Going to the next track...");

	if (!currentPlayingPlaylist) {
		log.warn(
			"Can't go to the next track, because there is currently nothing playing"
		);
		return;
	}

	if (currentPlayingPlaylistIndex + 1 >= currentPlayingPlaylist.length) {
		log.warn(
			"Can't go to next track, because the current playing song is the last song."
		);
		return;
	}

	reportPlaybackStoppedAndStartPlaying(
		undefined,
		currentPlayingPlaylistIndex + 1,
		_disconnectOnFinish
	);
}

function previousTrack() {
	log.debug("Going to the previous track...");

	if (ticksToSeconds(getPostitionTicks()) > 10) {
		return;
	}

	// don't go to the previous track when nothing is playing
	if (!currentPlayingPlaylist) {
		log.warn(
			"Can't go to the previous track, because there's currently nothing playing"
		);
		return;
	}

	if (currentPlayingPlaylistIndex - 1 < 0) {
		log.warn(
			"Can't go to the previous track, because this is the first track in the playlist"
		);
		return;
	}

	reportPlaybackStoppedAndStartPlaying(
		undefined,
		currentPlayingPlaylistIndex - 1,
		_disconnectOnFinish
	);
}

/**
 * @param {Object=} disconnectVoiceConnection - Optional The voice Connection do disconnect from
 */
function stop(disconnectVoiceConnection, itemId = getItemId()) {
	isPaused = true;
	if (interactivemsghandler.hasMessage()) {
		interactivemsghandler.destroy();
	}
	if (disconnectVoiceConnection) {
		disconnectVoiceConnection.disconnect();
	}
	log.debug(
		"stop playback and send following payload as reportPlaybackStopped to the server: ",
		getStopPayload()
	);
	jellyfinClientManager
		.getJellyfinClient()
		.reportPlaybackStopped(getStopPayload());
	if (getAudioDispatcher()) {
		try {
			getAudioDispatcher().destroy();
		} catch (error) {
			console.error(error);
		}
	}
	setAudioDispatcher(undefined);
}

function pause() {
	log.debug("Pausing the current track...");
	isPaused = true;

	// report to Jellyfin that the client has paused the track
	jellyfinClientManager
		.getJellyfinClient()
		.reportPlaybackProgress(getProgressPayload());

	// pause the track in the audio dispatcher
	getAudioDispatcher().pause(true);
}

function resume() {
	log.debug("Resuming playback of the current track...");

	isPaused = false;

	// report to Jellyfin that the client has resumed playback
	jellyfinClientManager
		.getJellyfinClient()
		.reportPlaybackProgress(getProgressPayload());

	// resume playback in the audio dispatcher
	getAudioDispatcher().resume();
}

/**
 * Pauses the playback of the current track is playing or
 * resumes the placback if the current track is paused
 */
function playPause() {
	const audioDispatcher = getAudioDispatcher();

	if (!audioDispatcher) {
		log.warn(
			"Can't toggle the playback of the current song because there is nothing playing right now"
		);
		return;
	}

	if (audioDispatcher.paused) {
		log.debug("Resuming playback because the current track is paused...");
		resume();
		return;
	}

	log.debug("Pausing the playback because the current track is playing...");
	pause();
}

function getPostitionTicks() {
	// this is very sketchy but i dont know how else to do it
	return (
		(_seek + getAudioDispatcher().streamTime - getAudioDispatcher().pausedTime) *
		10000
	);
}

function getPlayMethod() {
	// TODO figure out how to figure this out
	return "DirectPlay";
}

function getRepeatMode() {
	if (isRepeat) {
		return "RepeatOne";
	}

	return "RepeatNone";
}

function getPlaylistItemId() {
	return getItemId();
}

function getPlaySessionId() {
	// TODO: generate a unique identifier for identification at Jellyfin. This may cause conflicts when running multiple bots on the same Jellyfin server.
	return "ae2436edc6b91b11d72aeaa67f84e0ea";
}

function getNowPLayingQueue() {
	return [
		{
			Id: getItemId(),
			// as I curently dont support Playlists
			PlaylistItemId: getPlaylistItemId()
		}
	];
}

function getCanSeek() {
	return true;
}

function getIsMuted() {
	return false;
}

function getVolumeLevel() {
	return 100;
}

function getItemId() {
	if (typeof currentPlayingPlaylist !== "undefined") {
		return currentPlayingPlaylist[currentPlayingPlaylistIndex];
	}
	return undefined;
}

function getIsPaused() {
	// AudioDispacker Paused is to slow

	if (isPaused === undefined) {
		isPaused = false;
	}

	return isPaused;
}

function setIsRepeat(arg) {
	if (arg === undefined) {
		if (!(isRepeat === undefined)) {
			isRepeat = !isRepeat;
		}
	}
	isRepeat = arg;
}

function getProgressPayload() {
	const payload = {
		CanSeek: getCanSeek(),
		IsMuted: getIsMuted(),
		IsPaused: getIsPaused(),
		ItemId: getItemId(),
		MediaSourceId: getItemId(),
		NowPlayingQueue: getNowPLayingQueue(),
		PlayMethod: getPlayMethod(),
		PlaySessionId: getPlaySessionId(),
		PlaylistItemId: getPlaylistItemId(),
		PositionTicks: getPostitionTicks(),
		RepeatMode: getRepeatMode(),
		VolumeLevel: getVolumeLevel(),
		EventName: "pauseplayupdate"
	};
	return payload;
}

function getStopPayload() {
	return {
		userId: jellyfinClientManager.getJellyfinClient().getCurrentUserId(),
		itemId: getItemId(),
		sessionID: getPlaySessionId(),
		playSessionId: getPlaySessionId(),
		positionTicks: getPostitionTicks()
	};
}

module.exports = {
	startPlaying,
	stop,
	playPause,
	resume,
	pause,
	seek,
	setIsRepeat,
	nextTrack,
	previousTrack,
	addTracks,
	getPostitionTicks,
	spawnPlayMessage
};
