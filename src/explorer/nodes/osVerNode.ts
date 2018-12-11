import { TreeItemCollapsibleState } from 'vscode';
import { BaseNode } from './baseNode';
import { DeviceNode } from './deviceNode';

import appc from '../../appc';
import { targetForName } from '../../utils';

export class OSVerNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Collapsed;
	public readonly contextValue: string = 'OSVerNode';
	public readonly targetId: string;
	public readonly version: string;

	constructor (
		public readonly label: string,
		public readonly platform: string,
		public readonly target: string
	) {
		super(label);
		this.version = label;
		this.targetId = targetForName(this.target);
	}

	public getChildren (): DeviceNode[] {
		const simulators: DeviceNode[] = [];
		const sims = appc.iOSSimulators();
		for (const sim of sims[this.version]) {
			simulators.push(new DeviceNode(sim.name, this.platform, this.target, sim.udid, this.targetId, this.version));
		}
		return simulators;
	}

	get tooltip () {
		return this.label;
	}
}
