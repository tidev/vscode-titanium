import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { ExtensionContainer } from '../../../../container';
import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { TiTerminalLinkProvider } from '../../../../providers/terminalLinkProvider';

type DeepPartial<T> = {
	[P in keyof T]?: DeepPartial<T[P]>;
};

/** Android examples
[INFO]  Error: fooooooo
[INFO]  at Window.doClick (/alloy/controllers/index.js:52:17)
[INFO]  at Window.value (ti:/kroll.js:1604:27)
[INFO]  at Window.value (ti:/kroll.js:1656:25)
[INFO]  Error: I bet this breaks
[INFO]  at foo (/app.js:19:15)
[INFO]  at Window.doClick (/alloy/controllers/index.js:53:16)
[INFO]  at Window.value (ti:/kroll.js:1604:27)
[INFO]  at Window.value (ti:/kroll.js:1656:25)
[INFO]  Error: from widget
[INFO]  at Controller.exports.showAlert (/alloy/widgets/test/controllers/widget.js:64:17)
[INFO]  at Window.doClick (/alloy/controllers/index.js:54:12)
[INFO]  at Window.value (ti:/kroll.js:1604:27)
[INFO]  at Window.value (ti:/kroll.js:1656:25)
[INFO]  Error: from lib
[INFO]  at Object.foo (/test.js:3:15)
[INFO]  at Window.doClick (/alloy/controllers/index.js:55:22)
[INFO]  at Window.value (ti:/kroll.js:1604:27)
[INFO]  at Window.value (ti:/kroll.js:1656:25)
[ERROR] TiExceptionHandler: (main) [977680,977824] ti:/kroll.js:1040
[ERROR] TiExceptionHandler:           throw new Error(`Requested module not found: ${request}`); // TODO Set 'code' property to 'MODULE_NOT_FOUND' to match Node?
[ERROR] TiExceptionHandler:        ^
[ERROR] TiExceptionHandler: Error: Requested module not found: fooooo
[ERROR] TiExceptionHandler:     at Module.require (ti:/kroll.js:1040:14)
[ERROR] TiExceptionHandler:     at Module.global.Module.require (<embedded>:5086:32)
[ERROR] TiExceptionHandler:     at require (ti:/kroll.js:1310:22)
[ERROR] TiExceptionHandler:     at Window.doClick (/alloy/controllers/index.js:56:5)
[ERROR] TiExceptionHandler:     at Window.value (ti:/kroll.js:1604:27)
[ERROR] TiExceptionHandler:     at Window.value (ti:/kroll.js:1656:25)
 */

/* iOS examples
[INFO]  Error: fooooooo
[INFO]      at doClick (alloy/controllers/index.js:52:26)
[INFO]  Error: I bet this breaks
[INFO]      at foo (app.js:19:24)
[INFO]      at doClick (alloy/controllers/index.js:53:19)
[INFO]  Error: from widget
[INFO]      at  (alloy/widgets/test/controllers/widget.js:64:26)
[INFO]      at doClick (alloy/controllers/index.js:54:21)
[INFO]  Error: from lib
[INFO]      at foo (test.js:3:24)
[INFO]      at doClick (alloy/controllers/index.js:55:25)
[ERROR] /ti.kernel.js:879
[ERROR]         throw new Error("Requested module not found: ".concat(request)); // TODO Set 'code' property to 'MODULE_NOT_FOUND' to match Node?
[ERROR]                         ^
[ERROR] : Requested module not found: fooooo
[ERROR]     at require (/ti.kernel.js:879:24)
[ERROR]     at doClick (/alloy/controllers/index.js:56:12)
*/

describe('TerminalLinkProvider', () => {
	const provider = new TiTerminalLinkProvider();
	let sandbox: sinon.SinonSandbox;

	beforeEach(async function () {
		sandbox = sinon.createSandbox();
	});

	afterEach(async function () {
		sandbox.restore();
	});

	it('Should resolve the correct file for an iOS log', () => {
		const context: DeepPartial<vscode.TerminalLinkContext> = {
			line: '[INFO]      at doClick (alloy/controllers/index.js:50:26)',
			terminal: {
				creationOptions: {},
				name: 'Build ios'
			}
		};

		sandbox.stub(ExtensionContainer.runningTasks, 'has').returns(true);
		sandbox.stub(ExtensionContainer.runningTasks, 'get').returns({
			buildOptions: {
				platform: 'ios',
				projectDir: '/foo'
			}
		});

		const links = provider.provideTerminalLinks(context as vscode.TerminalLinkContext);

		expect(links.length).to.equal(1);
		expect(links[0]).to.deep.equal({
			startIndex: 24,
			length: 32,
			tooltip: 'Open file',
			line: 50,
			column: 26,
			terminalName: 'Build ios',
			projectDirectory: '/foo',
			filename: 'alloy/controllers/index.js',
			platform: 'ios'
		});
	});

	it('Should resolve the correct file for an Android log', () => {
		const context: DeepPartial<vscode.TerminalLinkContext> = {
			line: '[INFO]  at Window.doClick (/alloy/controllers/index.js:52:17)',
			terminal: {
				creationOptions: {},
				name: 'Build android'
			}
		};

		sandbox.stub(ExtensionContainer.runningTasks, 'has').returns(true);
		sandbox.stub(ExtensionContainer.runningTasks, 'get').returns({
			buildOptions: {
				platform: 'android',
				projectDir: '/foo'
			}
		});

		const links = provider.provideTerminalLinks(context as vscode.TerminalLinkContext);

		expect(links.length).to.equal(1);
		expect(links[0]).to.deep.equal({
			startIndex: 27,
			length: 33,
			tooltip: 'Open file',
			line: 52,
			column: 17,
			terminalName: 'Build android',
			projectDirectory: '/foo',
			filename: '/alloy/controllers/index.js',
			platform: 'android'
		});
	});
});
