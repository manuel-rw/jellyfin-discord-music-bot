const log = require("loglevel");

try {
	const CONFIG = require("../config.json");

	const jellyfinClientManager = require("./jellyfinclientmanager");

	const discordclientmanager = require("./discordclientmanager");
	discordclientmanager.init();
	const discordClient = discordclientmanager.getDiscordClient();
	const { handleChannelMessage } = require("./messagehandler");

	const prefix = require("loglevel-plugin-prefix");
	const chalk = require("chalk");
	const colors = {
		TRACE: chalk.magenta,
		DEBUG: chalk.cyan,
		INFO: chalk.blue,
		WARN: chalk.yellow,
		ERROR: chalk.red,
	};

	log.setLevel(CONFIG["log-level"]);

	prefix.reg(log);
	log.enableAll();

	prefix.apply(log, {
		format(level, name, timestamp) {
			return `${chalk.gray(`[${timestamp}]`)} ${colors[level.toUpperCase()](
				level
			)} ${chalk.green(`${name}:`)}`;
		},
	});

	prefix.apply(log.getLogger("critical"), {
		format(level, name, timestamp) {
			return chalk.red.bold(`[${timestamp}] ${level} ${name}:`);
		},
	});

	jellyfinClientManager.init();
	// TODO Error Checking as the apiclients is inefficent
	jellyfinClientManager
		.getJellyfinClient()
		.authenticateUserByName(
			CONFIG["jellyfin-username"],
			CONFIG["jellyfin-password"]
		)
		.then((response) => {
			jellyfinClientManager
				.getJellyfinClient()
				.setAuthenticationInfo(response.AccessToken, response.SessionInfo.UserId);
		});

	discordClient.on("message", (message) => {
		handleChannelMessage(message);
	});

	discordClient.login(CONFIG.token);
} catch (error) {
	log.error(error);
	console.error(error);
}
