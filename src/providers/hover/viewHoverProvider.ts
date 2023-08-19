import walkSync from 'klaw-sync';
import * as path from 'path';
import * as vscode from 'vscode';

import { BaseProvider } from '../baseProvider';

export class ViewHoverProvider extends BaseProvider implements vscode.HoverProvider {

	public async provideHover (document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover|undefined> {
		const project = await this.getProject(document);

		if (!project) {
			return;
		}

		const line = document.lineAt(position).text;
		const linePrefix = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
		// const wordRange = document.getWordRangeAtPosition(position);
		// const word = wordRange ? document.getText(wordRange) : null;

		const regExp = /['"]/g;
		let startIndex = 0;
		let endIndex = position.character;

		for (let matches = regExp.exec(line); matches !== null; matches = regExp.exec(line)) {
			if (matches.index < position.character) {
				startIndex = matches.index;
			} else if (matches.index > position.character) {
				endIndex = matches.index;
				break;
			}
		}

		const value = (startIndex && endIndex) ? line.substring(startIndex + 1, endIndex) : null;

		if (!value || value.length === 0) {
			return;
		}

		if (/image\s*[=:]\s*["'][\s0-9a-zA-Z-_^./]*$/.test(linePrefix)) {
			const imagePath = linePrefix.match(/image\s*[=:]\s*["']([\s0-9a-zA-Z-_^./]*)/);
			if (!imagePath) {
				return;
			}
			const relativePath = path.parse(imagePath[1]);
			const dir = path.join(project?.filePath, 'app', 'assets');
			// eslint-disable-next-line security/detect-non-literal-regexp
			const fileNameRegExp = new RegExp(`${relativePath.name}.*${relativePath.ext}$`);
			const files = walkSync(dir, {
				nodir: true,
				filter: item => item.stats.isDirectory() || fileNameRegExp.test(item.path)
			});
			let imageFile;
			let imageString = vscode.l10n.t('Image not found');
			if (files.length > 0) {
				imageFile = files[0];
				imageString = `![${imageFile.path}](${imageFile.path}|height=100)`;
			}
			const hover = new vscode.Hover(new vscode.MarkdownString(imageString), new vscode.Range(position.line, startIndex + 1, position.line, endIndex));
			return hover;
		}
	}
}
