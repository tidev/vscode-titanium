import { ChromeDebugAdapter, ChromeDebugSession, IAttachRequestArgs, ILaunchRequestArgs } from 'vscode-chrome-debug-core';
import { Event } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { MESSAGE_STRING, Request } from '../common/extensionProtocol';
import { BuildAppOptions } from '../types/cli';
import { LogLevel } from '../types/common';

interface TitaniumLaunchRequestArgs extends ILaunchRequestArgs {
	appRoot?: string;
}

export class TitaniumDebugAdapter extends ChromeDebugAdapter {
	public attach (args: IAttachRequestArgs): Promise<void> {
		return;
	}

	public launch (args: TitaniumLaunchRequestArgs): Promise<void> {
		return;
	}
	public disconnect (args: DebugProtocol.DisconnectArguments) {
		this.sendRequest('END', args);
		super.disconnect(args);
	}

	private sendRequest (code, args) {
		const request: Request = {
			id: `request-${++this.idCount}`,
			code,
			args
		};

		return new Promise(resolve => {
			this.activeRequests.set(request.id, resolve);

			this.session.sendEvent(new Event(MESSAGE_STRING, request));
		});
	}

}
