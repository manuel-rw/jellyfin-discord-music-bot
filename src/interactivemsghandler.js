const InterActivePlayMessage = require("./InterActivePlayMessage");
const CONFIG = require("../config.json");

const log = require("loglevel");

var interactivePlayMessage;

var updateInterval;

const init = (
	message,
	title,
	artist,
	imageURL,
	itemURL,
	getProgress,
	onPrevious,
	onPausePlay,
	onStop,
	onNext,
	onRepeat,
	playlistLenth
) => {
	if (typeof interactivePlayMessage !== "undefined") {
		destroy();
	}
	interactivePlayMessage = new InterActivePlayMessage(
		message,
		title,
		artist,
		imageURL,
		itemURL,
		getProgress,
		onPrevious,
		onPausePlay,
		onStop,
		onNext,
		onRepeat,
		playlistLenth
	);
};

const destroy = () => {
	if (typeof interactivePlayMessage !== "undefined") {
		interactivePlayMessage.destroy();
		interactivePlayMessage = undefined;
	} else {
		throw Error("No Interactive Message Found");
	}

	if (updateInterval !== "undefined") {
		clearInterval(updateInterval);
		updateInterval = undefined;
	}
};

const hasMessage = () => {
	if (typeof interactivePlayMessage === "undefined") {
		return false;
	} else {
		return true;
	}
};

/**
 *
 * @param {Function} callback function to retrieve current ticks
 */
const startUpate = (callback) => {
	if (
		typeof CONFIG["interactive-seek-bar-update-intervall"] === "number" &&
		CONFIG["interactive-seek-bar-update-intervall"] > 0
	) {
		updateInterval = setInterval(() => {
			interactivePlayMessage.updateProgress(callback());
		}, CONFIG["interactive-seek-bar-update-intervall"]);
	}
};

const updateCurrentSongMessage = (
	title,
	artist,
	imageURL,
	itemURL,
	ticksLength,
	playlistIndex,
	playlistLenth
) => {
	log.log(interactivePlayMessage);

	if (typeof interactivePlayMessage !== "undefined") {
		interactivePlayMessage.updateCurrentSongMessage(
			title,
			artist,
			imageURL,
			itemURL,
			ticksLength,
			playlistIndex,
			playlistLenth
		);
	} else {
		throw Error("No Interactive Message Found");
	}
};

module.exports = {
	init,
	destroy,
	hasMessage,
	startUpate,
	updateCurrentSongMessage
};
