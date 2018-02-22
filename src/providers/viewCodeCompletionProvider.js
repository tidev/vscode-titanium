const vscode = require('vscode');
const SnippetString = vscode.SnippetString;
const Range = vscode.Range;
const utils = require('../utils');
const alloyAutoCompleteRules = require('./alloyAutoCompleteRules');
const _ = require('underscore');

module.exports = {

    provideCompletionItems(document, position, token, context) {
        // console.log(`position: ${position.line}:${position.character}`);
        // console.log(`line: ${document.lineAt(position).text}`);

        const line = document.lineAt(position).text;
        const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));
        const wordRange = document.getWordRangeAtPosition(position);
        const prefix = wordRange ? document.getText(wordRange) : null;

        console.log(prefix);
        // console.log(`range: ${wordRange}`);
        // console.log(`${wordRange.start.character}-${wordRange.end.character} ${prefix}`);

        if (!this.completions) {
			this.loadCompletions();
		}

        // opening tag <_ or <Vie_
        if (/^\W*<\/?\w*$/.test(linePrefix)) {
            console.log('Tag...');
            return this.getTagNameCompletions(line, position, prefix);
        // attribute <View _ or <View backg_
        } else if (/^\W*<\/?\w+\W+\w*$/.test(linePrefix)) {
            console.log('Attrinute...');
            return this.getAttributeNameCompletions(linePrefix, position, prefix);
        // attribute value <View backgroundColor="_"
        } else if (/^\W*<\w+\W+\w*="[\w\.]*$/.test(linePrefix)) {
            console.log('Attrinute value...');
            let ruleResult;
			// first attempt Alloy rules (i18n, image etc.)
			_.find(alloyAutoCompleteRules, rule => ruleResult = rule.getCompletions(linePrefix, position, prefix));
			if (ruleResult) {
				return ruleResult;
			} else {
                return this.getAttributeValueCompletions(linePrefix, position, prefix);
            }
        }

        // return [];
    },

    loadCompletions() {
		this.completions = require('./completions');
		return _.extend(this.completions.properties, {
			id: {
				description: 'TSS id'
			},
			class: {
				description: 'TSS class'
			},
			platform: {
				type: 'String',
				description: 'Platform condition',
				values: [
					'android',
					'ios',
					'mobileweb',
					'windows'
				]
			}
		});
    },
    
    getTagNameCompletions(line, position, prefix) {
		// ensure prefix contains valid characters
		if (!/^[a-zA-Z]+$/.test(prefix)) {
			return [];
		}
		let completions = [];
		// let isClosing = new RegExp(`</${prefix}$`).test(line);
		for (let tag in this.completions.tags) {
            if (this.matches(tag, prefix)) {
                completions.push({
                    label: tag,
                    // insertText: new SnippetString(`${tag}$1>$2</${tag}>`),
                    kind: vscode.CompletionItemKind.Class,
                    detail: this.completions.tags[tag].apiName
                });
			}
        }
		return completions;
    },

    getAttributeNameCompletions(linePrefix, position, prefix) {
		let completions = [];
        // let tagName = this.getPreviousTag(editor.getBuffer(), bufferPosition);
        let tagName;
        const matches = linePrefix.match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
        if (matches) {
            tagName = matches[1];
        }
        let tagAttributes = this.getTagAttributes(tagName).concat([ 'id', 'class', 'platform', 'bindId' ]);
		let apiName = tagName;
		if (this.completions.tags[tagName] && this.completions.tags[tagName].apiName) {
			apiName = this.completions.tags[tagName].apiName;
		}
		let events = [];
		if (this.completions.types[apiName]) {
			events = this.completions.types[apiName].events;
		}

		//
		// Class properties
		//
		for (const attribute of tagAttributes) {
			if (!prefix || this.matches(attribute, prefix)) {
				// completions.push(autoCompleteHelper.suggestion({
				// 	type: 'property',
				// 	snippet: `${attribute}="$1"$0`,
				// 	displayText: attribute,
				// 	api: apiName,
				// 	property: attribute,
                // }));
                completions.push({
                    label: attribute,
                    insertText: new SnippetString(`${attribute}="$1"$0`),
                    kind: vscode.CompletionItemKind.Property
                });
			}
		}

		//
		// Event names - matches 'on' + event name
		//
		for (const event of events) {
			const attribute = `on${utils.capitalizeFirstLetter(event)}`;
			if (!prefix || this.matches(attribute, prefix)) {
				// completions.push(autoCompleteHelper.suggestion({
				// 	type: 'event',
				// 	snippet: `${attribute}="$1"$0`,
				// 	displayText: attribute,
				// 	api: apiName,
				// 	property: event,
                // }));
                completions.push({
                    label: attribute,
                    insertText: new SnippetString(`${attribute}="$1"$0`),
                    kind: vscode.CompletionItemKind.Event
                });
			}
		}

		return completions;
	},
    
    getAttributeValueCompletions(linePrefix, position, prefix) {
		let values;
        let tag;
        const matches = linePrefix.match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
        if (matches) {
            tag = matches[1];
        }
		let attribute = this.getPreviousAttribute(linePrefix, position);
		// let currentPath = editor.getPath();
		// let currentControllerName = path.basename(currentPath, path.extname(currentPath));
		let completions = [];

		//
		// realted TSS file
		//
		// if ((attribute === 'id') || (attribute === 'class')) {
		// 	let fileName;
		// 	let textBuffer = Utils.getTextBuffer(related.getTargetPath('tss', currentPath));
		// 	if (!textBuffer.isEmpty()) {
		// 		values = this.tokenTextForSelector(textBuffer, attribute);
		// 		fileName = textBuffer.getPath().split('/').pop();
		// 		for (const value of values) {
		// 			if (!prefix || Utils.firstCharsEqual(value, prefix)) {
		// 				completions.push(this.buildStyleSelectorCompletion(attribute, value, fileName));
		// 			}
		// 		}
		// 	}

		// 	//
		// 	// app.tss file
		// 	//
		// 	textBuffer = Utils.getTextBuffer(path.join(atom.project.getPaths()[0], 'app', 'styles', 'app.tss'));
		// 	if (!textBuffer.isEmpty()) {
		// 		values = this.tokenTextForSelector(textBuffer, attribute);
		// 		fileName = textBuffer.getPath().split('/').pop();
		// 		for (const value of values) {
		// 			if (!prefix || Utils.firstCharsEqual(value, prefix)) {
		// 				completions.push(this.buildStyleSelectorCompletion(attribute, value, fileName));
		// 			}
		// 		}
		// 	}

		// } else if (attribute === 'src') {
		// 	let alloyRootPath = Utils.getAlloyRootPath();

		// 	//
		// 	// Require src attribute
		// 	//
		// 	if (tag === 'Require') {
		// 		let controllerPath = path.join(alloyRootPath, 'controllers');
		// 		if (Utils.directoryExists(controllerPath)) {
		// 			let files = find.fileSync(/\.js$/, controllerPath);
		// 			for (const file of files) {
		// 				if (currentPath !== file) { // exclude current controller
		// 					let prefix = Utils.getCustomPrefix({ bufferPosition, editor });
		// 					let additionalPrefix = (prefix.startsWith('/') ? '' : '/');
		// 					let value = Utils.toUnixPath(file.replace(controllerPath, '').split('.')[0]);
		// 					completions.push(autoCompleteHelper.suggestion({
		// 						type: 'require',
		// 						text: value,
		// 						replacementPrefix: additionalPrefix + prefix,
		// 						onDidInsertSuggestion({ editor, triggerPosition, suggestion }) {
		// 							let targetRange = [
		// 								[ triggerPosition.row, 0 ],
		// 								[ triggerPosition.row, triggerPosition.column ]
		// 							];
		// 							let originText = editor.getTextInRange(targetRange);
		// 							if (!(new RegExp(`${suggestion.replacementPrefix}$`)).test(originText)) {
		// 								return editor.setTextInBufferRange(targetRange, originText.replace(new RegExp(`${prefix}$`), `${value}`));
		// 							}
		// 						}
		// 					}));
		// 				}
		// 			}
		// 		}

		// 	//
		// 	// Widget src attribute
		// 	//
		// 	} else if (tag === 'Widget') {
		// 		if (alloyRootPath) {
		// 			let alloyConfigPath = path.join(alloyRootPath, 'config.json');
		// 			try {
		// 				let configObj = JSON.parse(fs.readFileSync(alloyConfigPath));
		// 				for (let widgetName in (configObj ? configObj.dependencies : undefined)) {
		// 					completions.push(autoCompleteHelper.suggestion({
		// 						type: 'require',
		// 						text: widgetName,
		// 						replacementPrefix: Utils.getCustomPrefix({ bufferPosition, editor })
		// 					}));
		// 				}
		// 			} catch (e) {
		// 				return [];
		// 			}
		// 		}
		// 	}

		// 	//
		// 	// Attribute values for prefix
		// 	//
		// } else {
			values = this.getAttributeValues(attribute);
			for (let value of values) {
				value = value.replace(/["']/g, '');
				if (!prefix || this.matches(value, prefix)) {
                    completions.push({
                        label: value,
                        kind: vscode.CompletionItemKind.Value
                    });
				}
			}
		// }

		return completions;
    },
    
    matches(tag, prefix) {
        return new RegExp(prefix, 'i').test(tag);
    },

    getTagAttributes(tag) {
		const type = this.completions.types[this.completions.tags[tag] ? this.completions.tags[tag].apiName : undefined];
		if (type) {
			return type.properties;
		}
		return [];
	},

    getAttributeValues(attribute) {
		attribute = this.completions.properties[attribute];
		return (attribute ? attribute.values : undefined) ? (attribute  ? attribute.values : undefined) : [];
    },
    
    getPreviousAttribute(linePrefix, position) {
		// Remove everything until the opening quote
		let quoteIndex = position.character - 1;
		while (linePrefix[quoteIndex] && !([ '"', '\'' ].includes(linePrefix[quoteIndex]))) {
			quoteIndex--;
		}
		linePrefix = linePrefix.substring(0, quoteIndex);
		const matches = /\s+([a-zA-Z][-a-zA-Z]*)\s*=\s*$/.exec(linePrefix);
		if (matches && matches.length >= 2) {
			return matches[1];
		}
	},
};
