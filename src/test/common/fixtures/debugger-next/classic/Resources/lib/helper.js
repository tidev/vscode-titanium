function makeLabel(text) {
	const label = Ti.UI.createLabel({
		text: text,
		color: '#000'
	});
	return label;
}

exports.makeLabel = makeLabel;
