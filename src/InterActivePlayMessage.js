const discordclientmanager = require("./discordclientmanager");
const CONFIG = require("../config.json");
const { secondsToHms, ticksToSeconds } = require("./util");
const log = require("loglevel");

const getProgressString = (percent) => {
	// the min with of the discord window allows for this many chars
	const NUMBER_OF_CHARS = 12;
	let string = "";
	for (let iX = 0; iX < NUMBER_OF_CHARS; iX++) {
		if (percent > iX / NUMBER_OF_CHARS) {
			string += "█";
		} else {
			string += "▒";
		}
	}
	return string;
};

/**
 *
 * @param {String} string
 * @returns {String}
 */
// TODO do this with something like wcwidth
function getMaxWidthString = (string) => {
	const NUMBER_OF_CHARS = 12;
	if (string.length > NUMBER_OF_CHARS) {
		return string.slice(0, NUMBER_OF_CHARS - 3) + "...";
	}
	return string;
};

class InterActivePlayMessage {
	// musicplayermessage
	// probably should have done events instead of callbacks
	/**
	 *
	 * @param {Object} message
	 * @param {String} title
	 * @param {String} artist
	 * @param {String} imageURL
	 * @param {String} itemURL
	 * @param {Number} ticksLength
	 * @param {Function} onPrevious
	 * @param {Function} onPausePlay
	 * @param {Function} onStop
	 * @param {Function} onNext
	 * @param {Function} onRepeat
	 */
	constructor(
		message,
		title,
		artist,
		imageURL,
		itemURL,
		ticksLength,
		onPrevious,
		onPausePlay,
		onStop,
		onNext,
		onRepeat,
		playlistLenth,
	) {
		this.ticksLength = ticksLength;
		var exampleEmbed = {
			color: 0x0099ff,
			title: "Now Playing",
			url: itemURL,
			description: `\`\`${getMaxWidthString(title)}\`\` by \`\`${getMaxWidthString(
				artist,
			)}\`\``,
			thumbnail: {
				url: imageURL,
			},
			fields: [],
			timestamp: new Date(),
		};
		if (typeof CONFIG["interactive-seek-bar-update-intervall"] === "number") {
			exampleEmbed.fields.push({
				name: getProgressString(0 / this.ticksLength),
				value: `${secondsToHms(0)} / ${secondsToHms(
					ticksToSeconds(this.ticksLength),
				)}`,
				inline: false,
			});
		}
		if (playlistLenth) {
			exampleEmbed.fields.push({
				name: `1 of ${playlistLenth}`,
				value: "Playlist",
				inline: false,
			});
		}
		message.channel
			.send({
				embed: exampleEmbed,
			})
			.then((val) => {
				this.musicplayermessage = val;
				val.react("⏮️");
				val.react("⏯️");
				val.react("⏹️");
				val.react("⏭️");
				val.react("🔁");
			})
			.catch(console.error);

		function reactionchange(reaction, user, musicplayermessage) {
			if (reaction.message.id === musicplayermessage.id && !user.bot) {
				try {
					switch (reaction._emoji.name) {
						case "⏮️":
							onPrevious();
							break;
						case "⏯️":
							onPausePlay();
							break;
						case "⏹️":
							onStop();
							break;
						case "⏭️":
							onNext();
							break;
						case "🔁":
							onRepeat();
							break;
						default:
							break;
					}
				} catch (error) {}
			}
		}

		discordclientmanager
			.getDiscordClient()
			.on("messageReactionAdd", (reaction, user) => {
				reactionchange(reaction, user, this.musicplayermessage);
			});
		discordclientmanager
			.getDiscordClient()
			.on("messageReactionRemove", (reaction, user) => {
				reactionchange(reaction, user, this.musicplayermessage);
			});
	}

	updateProgress(ticks) {
		if (
			typeof this.musicplayermessage !== "undefined" &&
			typeof this.musicplayermessage.embeds[0] !== "undefined" &&
			typeof this.musicplayermessage.embeds[0].fields[0] !== "undefined"
		) {
			this.musicplayermessage.embeds[0].fields[0] = {
				name: getProgressString(ticks / this.ticksLength),
				value: `${secondsToHms(ticksToSeconds(ticks))} / ${secondsToHms(
					ticksToSeconds(this.ticksLength),
				)}`,
				inline: false,
			};

			this.musicplayermessage.timestamp = new Date();
			this.musicplayermessage.edit(this.musicplayermessage.embeds[0]);
		}
	}

	updateCurrentSongMessage(
		title,
		artist,
		imageURL,
		itemURL,
		ticksLength,
		playlistIndex,
		playlistLenth,
	) {
		if (!this.musicplayermessage) {
			log.error("Interactive play message was not found");
			return;
		}

		if (this.musicplayermessage.embeds.length === 0) {
			log.error("Interactive play message was unable to access embeds");
			return;
		}

		this.musicplayermessage.embeds[0].url = itemURL;
		this.musicplayermessage.embeds[0].description = `\`\`${getMaxWidthString(
			title,
		)}\`\` by \`\`${getMaxWidthString(artist)}\`\``;
		this.musicplayermessage.embeds[0].thumbnail = { url: imageURL };
		const indexOfPlaylistMessage =
			this.musicplayermessage.embeds[0].fields.findIndex((element) => {
				return element.value === "Playlist";
			});
		if (indexOfPlaylistMessage === -1) {
			this.musicplayermessage.embeds[0].fields.push({
				name: `${playlistIndex} of ${playlistLenth}`,
				value: "Playlist",
				inline: false,
			});
		} else {
			this.musicplayermessage.embeds[0].fields[
				indexOfPlaylistMessage
			].name = `${playlistIndex} of ${playlistLenth}`;
		}
		this.ticksLength = ticksLength;

		this.musicplayermessage.timestamp = new Date();
		this.musicplayermessage.edit(this.musicplayermessage.embeds[0]);
	}

	destroy() {
		this.musicplayermessage.delete();
		delete this;
	}
}

module.exports = InterActivePlayMessage;
