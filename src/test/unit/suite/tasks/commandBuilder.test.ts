import { expect } from 'chai';
import { describe, it } from 'mocha';
import { CommandBuilder } from '../../../../tasks/commandBuilder';

describe('CommandBuilder', () => {

	function mockOS (platform: string) {
		const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

		Object.defineProperty(process, 'platform', {
			value: platform
		});

		return () => {
			Object.defineProperty(process, 'platform', originalPlatform!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
		};
	}

	it('should support creating with args', () => {
		const builder = CommandBuilder.create('test', 'foo');
		expect(builder.resolve()).to.deep.equal({
			command: 'test',
			environment: {},
			args: [ 'foo' ]
		});
	});

	it('should support adding args', () => {
		const builder = CommandBuilder.create('test');

		builder.addFlag('--flag');
		builder.addOption('--opt', 'val');

		expect(builder.resolve()).to.deep.equal({
			command: 'test',
			environment: {},
			args: [ '--flag', '--opt', 'val' ]
		});
	});

	it('should support adding quoted args', () => {
		const builder = CommandBuilder.create('test');

		builder.addQuotedOption('--opt', 'val');

		expect(builder.resolve()).to.deep.equal({
			command: 'test',
			environment: {},
			args: [ '--opt', '"val"' ]
		});
	});

	it('should support adding multiple args', () => {
		const builder = CommandBuilder.create('test');

		builder.addArgs([ 'multiple', 'args' ]);

		expect(builder.resolve()).to.deep.equal({
			command: 'test',
			environment: {},
			args: [ 'multiple', 'args' ]
		});
	});

	it('should support adding environment variables on unix platform', () => {
		const fixProcessPlatform = mockOS('darwin');

		const builder = CommandBuilder.create('test');

		builder.addEnvironmentArgument('--password', 'hunter2');

		expect(builder.resolve()).to.deep.equal({
			command: 'test',
			environment: {
				PASSWORD: 'hunter2'
			},
			args: [ '--password', '$PASSWORD' ]
		});

		fixProcessPlatform();
	});

	it('should support adding environment variables on windows platform', () => {
		const fixProcessPlatform = mockOS('win32');

		const builder = CommandBuilder.create('test');

		builder.addEnvironmentArgument('--password', 'hunter2');

		expect(builder.resolve()).to.deep.equal({
			command: 'test',
			environment: {
				PASSWORD: 'hunter2'
			},
			args: [ '--password', '%PASSWORD%' ]
		});

		fixProcessPlatform();
	});

	it('should support all of them together', () => {
		const fixProcessPlatform = mockOS('darwin');

		const builder = CommandBuilder.create('test');

		builder.addFlag('--flag');
		builder.addOption('--opt', 'val');
		builder.addEnvironmentArgument('--password', 'hunter2');

		expect(builder.resolve()).to.deep.equal({
			command: 'test',
			environment: {
				PASSWORD: 'hunter2'
			},
			args: [ '--flag', '--opt', 'val', '--password', '$PASSWORD' ]
		});
		fixProcessPlatform();
	});
});
