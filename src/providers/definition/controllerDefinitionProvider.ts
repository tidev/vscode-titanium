import * as path from 'path';

import * as vscode from 'vscode';
import { Project } from '../../project';
import { BaseDefinitionProvider } from './baseDefinitionProvider';

export class ControllerDefinitionProvider extends BaseDefinitionProvider {
	protected override suggestions = [
		{ // require (/lib) name
			regExp: /require\(["']([-a-zA-Z0-9-_/]*)$/,
			files (project: Project, document: vscode.TextDocument, text: string, value: string): string[] {
				return [ path.join(project.filePath, 'app', 'lib', `${value}.js`) ];
			}
		},
		{ // ES6 import from (/lib) name
                	regExp: /import (?:[-a-zA-Z0-9-_/\s]*)['"]([-a-zA-Z0-9-_/]*)$/,
	                files (project: Project, document: vscode.TextDocument, text: string, value: string): string[] {
	                    	return [path.join(project.filePath, 'app', 'lib', `${value}.js`)];
        	        }
            	},
		{ // controller name
			regExp: /Alloy\.createController\(["']([-a-zA-Z0-9-_/]*)$/,
			files (project: Project, document: vscode.TextDocument, text: string, value: string): string[] {
				return [ path.join(project.filePath, 'app', 'controllers', `${value}.js`) ];
			}
		},
		{ // collection / model name (instance)
			regExp: /Alloy\.(Collections|Models).instance\(["']([-a-zA-Z0-9-_/]*)$/,
			files (project: Project, document: vscode.TextDocument, text: string, value: string): string[] {
				return [ path.join(project.filePath, 'app', 'models', `${value}.js`) ];
			}
		},
		{ // collection / model name (create)
			regExp: /Alloy\.create(Collection|Model)\(["']([-a-zA-Z0-9-_/]*)$/,
			files (project: Project, document: vscode.TextDocument, text: string, value: string): string[] {
				return [ path.join(project.filePath, 'app', 'models', `${value}.js`) ];
			}
		},
		{ // widget name
			regExp: /Alloy\.createWidget\(["']([-a-zA-Z0-9-_/.]*)$/,
			files (project: Project, document: vscode.TextDocument, text: string, value: string): string[] {
				return [ path.join(project.filePath, 'app', 'widgets', value, 'controllers', 'widget.js') ];
			}
		},
		{ // controller name
			regExp: /Widget\.createController\(["']([-a-zA-Z0-9-_/]*)$/,
			files (project: Project, document: vscode.TextDocument, text: string, value: string): string[] {
				const dir = path.dirname(document.fileName);
				return [ path.join(dir, `${value}.js`) ];
			}
		},
		{ // collection / model name (instance)
			regExp: /Widget\.(Collections|Models).instance\(["']([-a-zA-Z0-9-_/]*)$/,
			files (project: Project, document: vscode.TextDocument, text: string, value: string): string[] {
				const dir = path.dirname(document.fileName);
				return [ path.resolve(dir, `../models/${value}.js`) ];
			}
		},
		{ // collection / model name (create)
			regExp: /Widget\.create(Collection|Model)\(["']([-a-zA-Z0-9-_/]*)$/,
			files (project: Project, document: vscode.TextDocument, text: string, value: string): string[] {
				const dir = path.dirname(document.fileName);
				return [ path.resolve(dir, `../models/${value}.js`) ];
			}
		}
	];
}
