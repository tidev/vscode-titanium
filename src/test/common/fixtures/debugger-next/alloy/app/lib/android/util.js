function shout(text) {
	const upper = String(text).toUpperCase();
	return '[A] ' + upper + '!';
}

function tag() {
	return 'android';
}

exports.shout = shout;
exports.tag = tag;
