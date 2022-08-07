const interactivemsghandler = require("./interactivemsghandler");
const CONFIG = require("../config.json");
const discordclientmanager = require("./discordclientmanager");
const log = require("loglevel");

const {
	getAudioDispatcher,
	setAudioDispatcher,
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
		"start playing ",
		playlistIndex,
		". of list: ",
		itemIDPlaylist,
		" in a voiceconnection?: ",
		typeof voiceconnection !== "undefined"
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
				seek: seekTo,
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
				playMethod: getPlayMethod(),
			});
		}

		getAudioDispatcher().on("finish", () => {
			if (isRepeat) {
				log.debug(
					"repeat and sending following payload as reportPlaybackStopped to the server: ",
					getStopPayload()
				);
				jellyfinClientManager
					.getJellyfinClient()
					.reportPlaybackStopped(getStopPayload());
				startPlaying(voiceconnection, undefined, currentPlayingPlaylistIndex, 0);
			} else {
				if (currentPlayingPlaylist.length < playlistIndex) {
					if (disconnectOnFinish) {
						stop(voiceconnection, currentPlayingPlaylist[playlistIndex - 1]);
					} else {
						stop(undefined, currentPlayingPlaylist[playlistIndex - 1]);
					}
				} else {
					log.debug(
						"repeat and sending following payload as reportPlaybackStopped to the server: ",
						getStopPayload()
					);
					jellyfinClientManager
						.getJellyfinClient()
						.reportPlaybackStopped(getStopPayload());
					startPlaying(
						voiceconnection,
						undefined,
						currentPlayingPlaylistIndex + 1,
						0
					);
				}
			}
		});
	}
	playasync().catch((rsn) => {
		console.error(rsn);
	});
}

async function spawnPlayMessage(message) {
	log.debug("spawned Play Message?: ", typeof message !== "undefined");
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
		console.error(error);
	}
}

async function updatePlayMessage() {
	if (getItemId() !== undefined) {
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
			interactivemsghandler.updateCurrentSongMessage(
				itemIdDetails.Name,
				itemIdDetails.Artists[0] || "VA",
				imageURL,
				`${jellyfinClientManager
					.getJellyfinClient()
					.serverAddress()}/web/index.html#!/details?id=${itemIdDetails.AlbumId}`,
				itemIdDetails.RunTimeTicks,
				currentPlayingPlaylistIndex + 1,
				currentPlayingPlaylist.length
			);
		} catch (exception) {
			console.error(exception);
		}
	}
}

/**
 * @param {Number} toSeek - where to seek in ticks
 */
function seek(toSeek = 0) {
	log.debug("seek to: ", toSeek);
	if (getAudioDispatcher()) {
		startPlaying(
			undefined,
			undefined,
			undefined,
			ticksToSeconds(toSeek),
			_disconnectOnFinish
		);
		jellyfinClientManager
			.getJellyfinClient()
			.reportPlaybackProgress(getProgressPayload());
	} else {
		throw Error("No Song Playing");
	}
}
/**
 *
 * @param {Array} itemID - array of itemIDs to be added
 */
function addTracks(itemID) {
	log.debug("added track: ", itemID);
	currentPlayingPlaylist = currentPlayingPlaylist.concat(itemID);
}

function nextTrack() {
	log.debug("nextTrack");
	if (!currentPlayingPlaylist) {
		throw Error("There is currently nothing playing");
	} else if (currentPlayingPlaylistIndex + 1 >= currentPlayingPlaylist.length) {
		throw Error("This is the Last song");
	}

	log.debug(
		"sending following payload as reportPlaybackStopped to the server: ",
		getStopPayload()
	);
	jellyfinClientManager
		.getJellyfinClient()
		.reportPlaybackStopped(getStopPayload());

	startPlaying(
		undefined,
		undefined,
		currentPlayingPlaylistIndex + 1,
		0,
		_disconnectOnFinish
	);
}

function previousTrack() {
	log.debug("previousTrack");
	if (ticksToSeconds(getPostitionTicks()) < 10) {
		if (!currentPlayingPlaylist) {
			throw Error("There is currently nothing playing");
		} else if (currentPlayingPlaylistIndex - 1 < 0) {
			startPlaying(
				undefined,
				undefined,
				currentPlayingPlaylistIndex,
				0,
				_disconnectOnFinish
			);
			throw Error("This is the First song");
		}

		log.debug(
			"sending following payload as reportPlaybackStopped to the server: ",
			getStopPayload()
		);
		jellyfinClientManager
			.getJellyfinClient()
			.reportPlaybackStopped(getStopPayload());

		startPlaying(
			undefined,
			undefined,
			currentPlayingPlaylistIndex - 1,
			0,
			_disconnectOnFinish
		);
	}
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
	log.debug("pause");
	isPaused = true;
	jellyfinClientManager
		.getJellyfinClient()
		.reportPlaybackProgress(getProgressPayload());
	getAudioDispatcher().pause(true);
}

function resume() {
	log.debug("resume");
	isPaused = false;
	jellyfinClientManager
		.getJellyfinClient()
		.reportPlaybackProgress(getProgressPayload());
	getAudioDispatcher().resume();
}

function playPause() {
	if (!getAudioDispatcher()) {
		throw Error("There is nothing Playing right now!");
	}
	if (getAudioDispatcher().paused) {
		resume();
	} else {
		pause();
	}
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
	} else {
		return "RepeatNone";
	}
}

function getPlaylistItemId() {
	return getItemId();
}

function getPlaySessionId() {
	// i think its just a number which you dont need to retrieve but need to report
	return "ae2436edc6b91b11d72aeaa67f84e0ea";
}

function getNowPLayingQueue() {
	return [
		{
			Id: getItemId(),
			// as I curently dont support Playlists
			PlaylistItemId: getPlaylistItemId(),
		},
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
		EventName: "pauseplayupdate",
	};
	return payload;
}

function getStopPayload() {
	const payload = {
		userId: jellyfinClientManager.getJellyfinClient().getCurrentUserId(),
		itemId: getItemId(),
		sessionID: getPlaySessionId(),
		playSessionId: getPlaySessionId(),
		positionTicks: getPostitionTicks(),
	};
	return payload;
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
	spawnPlayMessage,
};
