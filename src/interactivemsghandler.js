const InterActivePlayMessage = require("./InterActivePlayMessage");
const CONFIG = require("../config.json");

const log = require("loglevel");

var iapm;

var updateInterval;

function init(
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
) {
	if (typeof iapm !== "undefined") {
		destroy();
	}
	iapm = new InterActivePlayMessage(
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
}

function destroy() {
	if (typeof iapm !== "undefined") {
		iapm.destroy();
		iapm = undefined;
	} else {
		throw Error("No Interactive Message Found");
	}

	if (updateInterval !== "undefined") {
		clearInterval(updateInterval);
		updateInterval = undefined;
	}
}

function hasMessage() {
	if (typeof iapm === "undefined") {
		return false;
	} else {
		return true;
	}
}
/**
 *
 * @param {Function} callback function to retrieve current ticks
 */
function startUpate(callback) {
	if (
		typeof CONFIG["interactive-seek-bar-update-intervall"] === "number" &&
		CONFIG["interactive-seek-bar-update-intervall"] > 0
	) {
		updateInterval = setInterval(() => {
			iapm.updateProgress(callback());
		}, CONFIG["interactive-seek-bar-update-intervall"]);
	}
}

function updateCurrentSongMessage(
	title,
	artist,
	imageURL,
	itemURL,
	ticksLength,
	playlistIndex,
	playlistLenth
) {
	log.log(iapm);

	if (typeof iapm !== "undefined") {
		iapm.updateCurrentSongMessage(
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
}

module.exports = {
	init,
	destroy,
	hasMessage,
	startUpate,
	updateCurrentSongMessage,
};
