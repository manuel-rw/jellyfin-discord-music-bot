const CONFIG = require("../config.json");
const Discord = require("discord.js");
const { checkJellyfinItemIDRegex } = require("./util");
const { hmsToSeconds, getDiscordEmbedError } = require("./util");

const discordclientmanager = require("./discordclientmanager");
const jellyfinClientManager = require("./jellyfinclientmanager");
const playbackmanager = require("./playbackmanager");
const websocketHanler = require("./websockethandler");
const discordClient = discordclientmanager.getDiscordClient();

var isSummendByPlay = false;

// random Color of the Jellyfin Logo Gradient
function getRandomDiscordColor() {
	const random = Math.random();
	function randomNumber(b, a) {
		return (
			Math.floor(random * Math.pow(Math.pow(b - a, 2), 1 / 2)) + (b > a ? a : b)
		);
	}

	const GRANDIENT_START = "#AA5CC3";
	const GRANDIENT_END = "#00A4DC";

	let rS = GRANDIENT_START.slice(1, 3);
	let gS = GRANDIENT_START.slice(3, 5);
	let bS = GRANDIENT_START.slice(5, 7);
	rS = parseInt(rS, 16);
	gS = parseInt(gS, 16);
	bS = parseInt(bS, 16);

	let rE = GRANDIENT_END.slice(1, 3);
	let gE = GRANDIENT_END.slice(3, 5);
	let bE = GRANDIENT_END.slice(5, 7);
	rE = parseInt(rE, 16);
	gE = parseInt(gE, 16);
	bE = parseInt(bE, 16);

	return (
		"#" +
		("00" + randomNumber(rS, rE).toString(16)).substr(-2) +
		("00" + randomNumber(gS, gE).toString(16)).substr(-2) +
		("00" + randomNumber(bS, bE).toString(16)).substr(-2)
	);
}

// Song Search, return the song itemID
async function searchForItemID(searchString) {
	const response = await jellyfinClientManager
		.getJellyfinClient()
		.getSearchHints({
			searchTerm: searchString,
			includeItemTypes: "Audio,MusicAlbum,Playlist",
		});

	if (response.TotalRecordCount < 1) {
		throw Error("Found nothing");
	} else {
		switch (response.SearchHints[0].Type) {
			case "Audio":
				return [response.SearchHints[0].ItemId];
			case "Playlist":
			case "MusicAlbum": {
				const resp = await jellyfinClientManager
					.getJellyfinClient()
					.getItems(jellyfinClientManager.getJellyfinClient().getCurrentUserId(), {
						sortBy: "SortName",
						sortOrder: "Ascending",
						parentId: response.SearchHints[0].ItemId,
					});
				const itemArray = [];
				resp.Items.forEach((element) => {
					itemArray.push(element.Id);
				});
				return itemArray;
			}
		}
	}
}

function summon(voiceChannel) {
	voiceChannel.join();
}

function summonMessage(message) {
	if (!message.member.voice.channel) {
		message.reply("please join a voice channel to summon me!");
	} else if (message.channel.type === "dm") {
		message.reply("no dms");
	} else {
		var desc = "**Joined Voice Channel** `";
		desc = desc.concat(message.member.voice.channel.name).concat("`");

		summon(message.member.voice.channel);

		const vcJoin = new Discord.MessageEmbed()
			.setColor(getRandomDiscordColor())
			.setTitle("Joined Channel")
			.setTimestamp()
			.setDescription("<:loudspeaker:757929476993581117> " + desc);
		message.channel.send(vcJoin);
	}
}

async function playThis(message) {
	const indexOfItemID =
		message.content.indexOf(CONFIG["discord-prefix"] + "play") +
		(CONFIG["discord-prefix"] + "play").length +
		1;
	const argument = message.content.slice(indexOfItemID);
	let items;
	// check if play command was used with itemID
	const regexresults = checkJellyfinItemIDRegex(argument);
	if (regexresults) {
		items = regexresults;
	} else {
		try {
			items = await searchForItemID(argument);
		} catch (e) {
			const noSong = getDiscordEmbedError(e);
			message.channel.send(noSong);
			playbackmanager.stop(
				isSummendByPlay
					? discordClient.user.client.voice.connections.first()
					: undefined,
			);
			return;
		}
	}

	playbackmanager.startPlaying(
		discordClient.user.client.voice.connections.first(),
		items,
		0,
		0,
		isSummendByPlay,
	);
	playbackmanager.spawnPlayMessage(message);
}

async function addThis(message) {
	const indexOfItemID =
		message.content.indexOf(CONFIG["discord-prefix"] + "add") +
		(CONFIG["discord-prefix"] + "add").length +
		1;
	const argument = message.content.slice(indexOfItemID);
	let items;
	// check if play command was used with itemID
	const regexresults = checkJellyfinItemIDRegex(argument);
	if (regexresults) {
		items = regexresults;
	} else {
		try {
			items = await searchForItemID(argument);
		} catch (e) {
			const noSong = getDiscordEmbedError(e);
			message.channel.send(noSong);
			return;
		}
	}

	playbackmanager.addTracks(items);
}

function handleChannelMessage(message) {
	getRandomDiscordColor();

	if (message.content.startsWith(CONFIG["discord-prefix"] + "summon")) {
		isSummendByPlay = false;

		websocketHanler.openSocket();

		summonMessage(message);
	} else if (
		message.content.startsWith(CONFIG["discord-prefix"] + "disconnect")
	) {
		playbackmanager.stop();
		jellyfinClientManager.getJellyfinClient().closeWebSocket();
		discordClient.user.client.voice.connections.forEach((element) => {
			element.disconnect();
		});
		var desc = "**Left Voice Channel** `";
		desc = desc.concat(message.member.voice.channel.name).concat("`");
		const vcJoin = new Discord.MessageEmbed()
			.setColor(getRandomDiscordColor())
			.setTitle("Left Channel")
			.setTimestamp()
			.setDescription("<:wave:757938481585586226> " + desc);
		message.channel.send(vcJoin);
	} else if (
		message.content.startsWith(CONFIG["discord-prefix"] + "pause") ||
		message.content.startsWith(CONFIG["discord-prefix"] + "resume")
	) {
		try {
			playbackmanager.playPause();
			const noPlay = new Discord.MessageEmbed()
				.setColor(0xff0000)
				.setTitle("<:play_pause:757940598106882049> " + "Paused/Resumed.")
				.setTimestamp();
			message.channel.send(noPlay);
		} catch (error) {
			const errorMessage = getDiscordEmbedError(error);
			message.channel.send(errorMessage);
		}
	} else if (message.content.startsWith(CONFIG["discord-prefix"] + "play")) {
		if (discordClient.user.client.voice.connections.size < 1) {
			summonMessage(message);
			isSummendByPlay = true;
		}

		playThis(message);
	} else if (message.content.startsWith(CONFIG["discord-prefix"] + "stop")) {
		if (isSummendByPlay) {
			if (discordClient.user.client.voice.connections.size > 0) {
				playbackmanager.stop(discordClient.user.client.voice.connections.first());
			}
		} else {
			playbackmanager.stop();
		}
	} else if (message.content.startsWith(CONFIG["discord-prefix"] + "seek")) {
		const indexOfArgument =
			message.content.indexOf(CONFIG["discord-prefix"] + "seek") +
			(CONFIG["discord-prefix"] + "seek").length +
			1;
		const argument = message.content.slice(indexOfArgument);
		try {
			playbackmanager.seek(hmsToSeconds(argument) * 10000000);
		} catch (error) {
			const errorMessage = getDiscordEmbedError(error);
			message.channel.send(errorMessage);
		}
	} else if (message.content.startsWith(CONFIG["discord-prefix"] + "skip")) {
		try {
			playbackmanager.nextTrack();
		} catch (error) {
			const errorMessage = getDiscordEmbedError(error);
			message.channel.send(errorMessage);
		}
	} else if (message.content.startsWith(CONFIG["discord-prefix"] + "add")) {
		addThis(message);
	} else if (message.content.startsWith(CONFIG["discord-prefix"] + "spawn")) {
		try {
			playbackmanager.spawnPlayMessage(message);
		} catch (error) {
			const errorMessage = getDiscordEmbedError(error);
			message.channel.send(errorMessage);
		}
	} else if (message.content.startsWith(CONFIG["discord-prefix"] + "help")) {
		/* eslint-disable quotes */
		const reply = new Discord.MessageEmbed()
			.setColor(getRandomDiscordColor())
			.setTitle(
				"<:musical_note:757938541123862638> " +
					"Jellyfin Discord Music Bot" +
					" <:musical_note:757938541123862638> ",
			)
			.addFields(
				{
					name: `${CONFIG["discord-prefix"]}summon`,
					value: "Join the channel the author of the message",
				},
				{
					name: `${CONFIG["discord-prefix"]}disconnect`,
					value: "Disconnect from all current Voice Channels",
				},
				{
					name: `${CONFIG["discord-prefix"]}play`,
					value: "Play the following item",
				},
				{
					name: `${CONFIG["discord-prefix"]}add`,
					value: "Add the following item to the current playlist",
				},
				{
					name: `${CONFIG["discord-prefix"]}pause/resume`,
					value: "Pause/Resume audio",
				},
				{
					name: `${CONFIG["discord-prefix"]}seek`,
					value: "Where to Seek to in seconds or MM:SS",
				},
				{
					name: `${CONFIG["discord-prefix"]}skip`,
					value: "Skip this Song",
				},
				{
					name: `${CONFIG["discord-prefix"]}spawn`,
					value: "Spawns an Interactive Play Controller",
				},
				{
					name: `${CONFIG["discord-prefix"]}help`,
					value: "Display this help message",
				},
				{
					name: `GitHub`,
					value:
						"Find the code for this bot at: https://github.com/KGT1/jellyfin-discord-music-bot",
				},
			);
		message.channel.send(reply);
		/* eslint-enable quotes */
	}
}

module.exports = {
	handleChannelMessage,
};
