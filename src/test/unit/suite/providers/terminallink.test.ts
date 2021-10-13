import * as chai from 'chai';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import sinonChai from 'sinon-chai';
import { ExtensionContainer } from '../../../../container';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { TiTerminalLinkProvider } from '../../../../providers/terminalLinkProvider';
import { getCommonAlloyProjectDirectory } from '../../../../test/common/utils';
import { Platform } from '../../../../types/common';

chai.use(sinonChai);
const { expect } = chai;

type DeepPartial<T> = {
	[P in keyof T]?: DeepPartial<T[P]>;
};

const mapContents = {
	version: 3,
	sources: [
		'template.js',
		'app/controllers/index.js'
	],
	names: [],
	mappings: 'AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;ACjDA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AD4CA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA',
	file: `${getCommonAlloyProjectDirectory()}/Resources/android/alloy/controllers/index.js`,
	sourceRoot: getCommonAlloyProjectDirectory(),
	sourcesContent: [
		'var Alloy = require(\'/alloy\'),\n\tBackbone = Alloy.Backbone,\n\t_ = Alloy._;\n\n\n\n\nfunction __processArg(obj, key) {\n\tvar arg = null;\n\tif (obj) {\n\t\targ = obj[key] || null;\n\t}\n\treturn arg;\n}\n\nfunction Controller() {\n\t\n\trequire(\'/alloy/controllers/\' + \'BaseController\').apply(this, Array.prototype.slice.call(arguments));\n\tthis.__controllerPath = \'index\';\n\tthis.args = arguments[0] || {};\n\n\tif (arguments[0]) {\n\t\tvar __parentSymbol = __processArg(arguments[0], \'__parentSymbol\');\n\t\tvar $model = __processArg(arguments[0], \'$model\');\n\t\tvar __itemTemplate = __processArg(arguments[0], \'__itemTemplate\');\n\t}\n\tvar $ = this;\n\tvar exports = {};\n\tvar __defers = {};\n\n\t// Generated code that must be executed before all UI and/or\n\t// controller code. One example is all model and collection\n\t// declarations from markup.\n\t\n\n\t// Generated UI code\n\t$.__views[\'index\'] = Ti.UI.createWindow(\n{id:\'index\',}\n);\n$.__views[\'index\'] && $.addTopLevelView($.__views[\'index\']);\ndoClick?$.addListener($.__views[\'index\'],\'click\',doClick):__defers[\'$.__views[\'index\']!click!doClick\']=true;$.__views[\'widg\'] = Alloy.createWidget(\'test\',\'widget\',{id:\'widg\',__parentSymbol:$.__views[\'index\'],});\n$.__views[\'widg\'].setParent($.__views[\'index\']);\nexports.destroy = function () {};\n\n\t// make all IDed elements in $.__views available right on the $ in a\n\t// controller\'s internal code. Externally the IDed elements will\n\t// be accessed with getView().\n\t_.extend($, $.__views);\n\n\t// Controller code directly from the developer\'s controller file\n\t__MAPMARKER_CONTROLLER_CODE__\n\n\t// Generated code that must be executed after all UI and\n\t// controller code. One example deferred event handlers whose\n\t// functions are not defined until after the controller code\n\t// is executed.\n\t__defers[\'$.__views[\'index\']!click!doClick\'] && $.addListener($.__views[\'index\'],\'click\',doClick);\n\n\t// Extend the $ instance with all functions and properties\n\t// defined on the exports object.\n\t_.extend($, exports);\n}\n\nmodule.exports = Controller;\n',
		'function doClick() {\n  console.log(new Error(\'fooooooo\'));\n  globalThis.foo();\n  $.widg.showAlert();\n  require(\'/test\').foo();\n  require(\'fooooo\');\n}\n$.index.open();'
	]
};

describe('TerminalLinkProvider', () => {
	const provider = new TiTerminalLinkProvider();
	let sandbox: sinon.SinonSandbox;
	const mapFile = path.join(getCommonAlloyProjectDirectory(), 'build', 'map', 'Resources', 'android', 'alloy', 'controllers', 'index.js.map');

	beforeEach(async function () {
		sandbox = sinon.createSandbox();
		await fs.writeJSON(mapFile, mapContents);
	});

	afterEach(async function () {
		sandbox.restore();
		await fs.unlink(mapFile);
	});

	describe('provideTerminalLinks', () => {

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
					projectDir: getCommonAlloyProjectDirectory()
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
				projectDirectory: getCommonAlloyProjectDirectory(),
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
					projectDir: getCommonAlloyProjectDirectory()
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
				projectDirectory: getCommonAlloyProjectDirectory(),
				filename: '/alloy/controllers/index.js',
				platform: 'android'
			});
		});

		it('should try to figure out the platform and project directory', () => {
			const context: DeepPartial<vscode.TerminalLinkContext> = {
				line: '[INFO]      at doClick (alloy/controllers/index.js:50:26)',
				terminal: {
					creationOptions: {
						cwd: getCommonAlloyProjectDirectory()
					},
					name: 'Build ios',
				}
			};

			sandbox.stub(ExtensionContainer.runningTasks, 'has').returns(false);

			const links = provider.provideTerminalLinks(context as vscode.TerminalLinkContext);

			expect(links.length).to.equal(1);
			expect(links[0]).to.deep.equal({
				startIndex: 24,
				length: 32,
				tooltip: 'Open file',
				line: 50,
				column: 26,
				terminalName: 'Build ios',
				projectDirectory: getCommonAlloyProjectDirectory(),
				filename: 'alloy/controllers/index.js',
				platform: 'ios'
			});
		});
	});

	describe('handleTerminalLink', () => {
		it('should lookup map the stacktrace info in a link back to the right source', async () => {
			const link = {
				startIndex: 27,
				length: 33,
				tooltip: 'Open file',
				line: 52,
				column: 17,
				terminalName: 'Build android',
				projectDirectory: getCommonAlloyProjectDirectory(),
				filename: '/alloy/controllers/index.js',
				platform: 'android' as Platform
			};

			const stub = sandbox.stub(vscode.window, 'showTextDocument');
			await provider.handleTerminalLink(link);

			const uri = vscode.Uri.parse(path.join(getCommonAlloyProjectDirectory(), 'app', 'controllers', 'index.js'));
			const range = new vscode.Range(1, 17, 1, 17);
			expect(stub.callCount).to.equal(1);
			expect(stub).to.have.been.calledWith(uri, { selection: range });
		});

		it('should try to detect platform if not provided', async () => {
			const link = {
				startIndex: 27,
				length: 33,
				tooltip: 'Open file',
				line: 52,
				column: 17,
				terminalName: 'Build android',
				projectDirectory: getCommonAlloyProjectDirectory(),
				filename: '/alloy/controllers/index.js'
			};

			const stub = sandbox.stub(vscode.window, 'showTextDocument');
			await provider.handleTerminalLink(link);

			const uri = vscode.Uri.parse(path.join(getCommonAlloyProjectDirectory(), 'app', 'controllers', 'index.js'));
			const range = new vscode.Range(1, 17, 1, 17);
			expect(stub.callCount).to.equal(1);
			expect(stub).to.have.been.calledWith(uri, { selection: range });
		});
	});
});
