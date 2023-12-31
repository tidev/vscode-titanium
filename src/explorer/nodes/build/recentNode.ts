import { BaseNode } from '../baseNode';

import { TreeItemCollapsibleState } from 'vscode';
import { ExtensionContainer } from '../../../container';
import { DeviceNode } from './deviceNode';
import { getDeviceNameFromId, nameForPlatform, nameForTarget } from '../../../utils';
import { Platform as NewPlatform } from '../../../types/common';
import { BlankNode } from '../blankNode';
import { isDistributionAppBuild } from '../../../tasks/tasksHelper';
import { GlobalState } from '../../../constants';
import { DistributeNode } from './distributeNode';

export class RecentNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Expanded;
	public readonly contextValue: string = 'RecentNode';
	public override readonly label = 'Recent';

	public override getChildren (): Array<BlankNode | DeviceNode> {
		const recentBuildNodes: Array<BlankNode | DeviceNode> = [];

		// If we're refreshing hold off on populating this list so that we don't error when creating
		// the pretty name
		const refreshingEnvironment = ExtensionContainer.context.globalState.get<boolean>(GlobalState.RefreshEnvironment);
		if (refreshingEnvironment) {
			return [ new BlankNode('Refreshing environment') ];
		}

		for (const [ , build ] of ExtensionContainer.recentBuilds) {
			if (!build) {
				continue;
			}

			if (isDistributionAppBuild(build)) {
				if (!build.target) {
					continue;
				}

				try {
					const nodeLabel = `${nameForPlatform(build.platform)} ${nameForTarget(build.target)}`;
					recentBuildNodes.push(new DistributeNode(nodeLabel, build.platform, nameForTarget(build.target), build.target));
				} catch (error) {
					// ignore errors as this might be down to the environment changing so this is now an invalid state
				}

			} else {
				if (!build.deviceId || !build.target) {
					continue;
				}
				try {
					const deviceName = getDeviceNameFromId(build.deviceId, build.platform, build.target);
					const lastBuildDescription = `${nameForPlatform(build.platform)} ${nameForTarget(build.target)} ${deviceName}`;

					recentBuildNodes.push(new DeviceNode(lastBuildDescription, build.platform as NewPlatform, build.target, build.deviceId, build.target));
				} catch (error) {
					// ignore errors as this might be down to the environment changing so this is now an invalid state
				}

			}
		}

		if (!recentBuildNodes.length) {
			recentBuildNodes.push(new BlankNode('No recent builds'));
		}

		// reverse the order so we display the most recent at the top
		return recentBuildNodes.reverse();
	}

	get tooltip (): string {
		return this.label;
	}
}
