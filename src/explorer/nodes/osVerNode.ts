import { TreeItemCollapsibleState } from 'vscode';
import { BaseNode } from './baseNode';
import { DeviceNode } from './deviceNode';

import { Platform } from '../../types/common';
import { targetForName } from '../../utils';
import { DevelopmentTarget, PrettyDevelopmentTarget } from '../../types/cli';
import { ExtensionContainer } from '../../container';

export class OSVerNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Collapsed;
	public readonly contextValue: string = 'OSVerNode';
	public override readonly targetId: DevelopmentTarget;
	public override readonly version: string;

	constructor (
		public override readonly label: string,
		public readonly platform: Platform,
		public readonly target: PrettyDevelopmentTarget
	) {
		super(label);
		this.version = label;
		this.targetId = targetForName(this.target) as DevelopmentTarget;
	}

	public override getChildren (): DeviceNode[] {
		const simulators: DeviceNode[] = [];
		if (this.platform === 'ios') {
			const sims = ExtensionContainer.environment.iOSSimulators();
			for (const sim of sims[this.version]) {
				simulators.push(new DeviceNode(sim.name, this.platform, this.targetId, sim.udid, this.targetId, this.version));
			}
		}
		return simulators;

	}

	get tooltip (): string {
		return this.label;
	}
}
