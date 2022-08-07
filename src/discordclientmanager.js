const Discord = require("discord.js");

var discordClient;

function init() {
	discordClient = new Discord.Client();
}
function getDiscordClient() {
	return discordClient;
}

module.exports = {
	getDiscordClient,
	init,
};
