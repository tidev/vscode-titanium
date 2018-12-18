import * as path from 'path';
import * as utils from '../../utils';
import { provideDefinition } from './definitionProviderHelper';

import * as vscode from 'vscode';

const suggestions = [
	{ // require (/lib) name
		regExp: /require\(["']([-a-zA-Z0-9-_/]*)$/,
		files (document, text, value) {
			return [ path.join(utils.getAlloyRootPath(), 'lib', `${value}.js`) ];
		}
	},
	{ // controller name
		regExp: /Alloy\.createController\(["']([-a-zA-Z0-9-_/]*)$/,
		files (document, text, value) {
			return [ document.fileName.replace(/app\/(.*)$/, `app/controllers/${value}.js`) ];
		}
	},
	{ // collection / model name (instance)
		regExp: /Alloy\.(Collections|Models).instance\(["']([-a-zA-Z0-9-_/]*)$/,
		files (document, text, value) {
			return [ document.fileName.replace(/app\/(.*)$/, `app/models/${value}.js`) ];
		}
	},
	{ // collection / model name (create)
		regExp: /Alloy\.create(Collection|Model)\(["']([-a-zA-Z0-9-_/]*)$/,
		files (document, text, value) {
			return [ document.fileName.replace(/app\/(.*)$/, `app/models/${value}.js`) ];
		}
	},
	{ // widget name
		regExp: /Alloy\.createWidget\(["']([-a-zA-Z0-9-_/]*)$/,
		files (document, text, value) {
			return [ document.fileName.replace(/app\/(.*)$/, `app/widgets/${value}/controllers/widget.js`) ];
		}
	},
	{ // controller name
		regExp: /Widget\.createController\(["']([-a-zA-Z0-9-_/]*)$/,
		files (document, text, value) {
			const dir = path.dirname(document.fileName);
			return [ path.join(dir, `${value}.js`) ];
		}
	},
	{ // collection / model name (instance)
		regExp: /Widget\.(Collections|Models).instance\(["']([-a-zA-Z0-9-_/]*)$/,
		files (document, text, value) {
			const dir = path.dirname(document.fileName);
			return [ path.resolve(dir, `../models/${value}.js`) ];
		}
	},
	{ // collection / model name (create)
		regExp: /Widget\.create(Collection|Model)\(["']([-a-zA-Z0-9-_/]*)$/,
		files (document, text, value) {
			const dir = path.dirname(document.fileName);
			return [ path.resolve(dir, `../models/${value}.js`) ];
		}
	}
];

export class ControllerDefinitionProvider implements vscode.DefinitionProvider {
	public provideDefinition (document: vscode.TextDocument, position: vscode.Position) {
		return provideDefinition(document, position, suggestions);
	}
}
