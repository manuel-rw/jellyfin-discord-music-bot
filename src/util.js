function checkJellyfinItemIDRegex(strgintomatch) {
	const regexresult = strgintomatch.match(/([0-9]|[a-f]){32}/);
	if (regexresult) {
		return [regexresult[0]];
	} else {
		return undefined;
	}
}

function ticksToSeconds(ticks) {
	return ticks / 10000000;
}

function hmsToSeconds(str) {
	var p = str.split(":");
	var s = 0;
	var m = 1;

	while (p.length > 0) {
		s += m * parseInt(p.pop(), 10);
		m *= 60;
	}

	return s;
}

function secondsToHms(totalSeconds) {
	const hours = Math.floor(totalSeconds / 3600);
	totalSeconds %= 3600;
	const minutes = Math.floor(totalSeconds / 60);
	let seconds = Math.floor(totalSeconds % 60);
	seconds = seconds < 10 && seconds > 0 ? `0${seconds}` : `${seconds}`;
	if (hours > 0) {
		return `${hours}:${minutes}:${seconds}`;
	} else {
		return `${minutes}:${seconds}`;
	}
}

function getDiscordEmbedError(e) {
	const Discord = require("discord.js");
	return new Discord.MessageEmbed()
		.setColor(0xff0000)
		.setTitle("Error!")
		.setTimestamp()
		.setDescription("<:x:757935515445231651> " + e);
}

module.exports = {
	checkJellyfinItemIDRegex,
	ticksToSeconds,
	hmsToSeconds,
	getDiscordEmbedError,
	secondsToHms,
};
