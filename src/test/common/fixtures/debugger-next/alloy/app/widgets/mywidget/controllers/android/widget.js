function render(text) {
	const wrapped = '[widget-android] ' + text;
	$.wlabel.text = wrapped;
	return wrapped;
}

exports.render = render;
