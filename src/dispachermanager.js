var audioDispatcher;

function setAudioDispatcher(par) {
	audioDispatcher = par;
}
function getAudioDispatcher() {
	return audioDispatcher;
}

module.exports = {
	setAudioDispatcher,
	getAudioDispatcher,
};
