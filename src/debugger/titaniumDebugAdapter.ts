import { ChromeDebugAdapter, IAttachRequestArgs, ILaunchRequestArgs } from 'vscode-chrome-debug-core';

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

}
