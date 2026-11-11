function add(a, b) {
	const sum = a + b + 0;
	return sum;
}

function describe(name) {
	const greeting = 'classic-android';
	const message = greeting + ':' + name;
	return message;
}

exports.add = add;
exports.describe = describe;
