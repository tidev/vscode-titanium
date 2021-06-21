import { ShellQuotedString, ShellQuoting } from 'vscode';

export interface Command {
	args: string[];
	command: string;
	environment: Record<string, string>;
}
export class CommandBuilder {
	public command: string;
	private readonly args: ShellQuotedString[] = [];
	private readonly environmentOptions: Record<string, string> = {};

	constructor (command: string) {
		this.command = command;
	}

	public static create (command: string, ...args: (string | ShellQuotedString | undefined)[]): CommandBuilder {
		const builder = new CommandBuilder(command);

		if (args !== undefined) {
			for (const arg of args) {
				builder.addArg(arg);
			}
		}

		return builder;
	}

	private addArg (arg: string | ShellQuotedString | undefined): CommandBuilder {
		if (typeof (arg) === 'string') {
			this.args.push(
				{
					value: arg,
					quoting: ShellQuoting.Escape
				}
			);
		} else if (arg !== undefined) {
			this.args.push(arg);
		}

		return this;
	}

	private toEnvironmentArg (value: string, quote = false) {
		if (process.platform === 'win32') {
			return quote ? `"%${value}%"` : `%${value}%`;
		} else {
			return quote ? `"$${value}"` : `$${value}`;
		}
	}

	public addOption (option: string, value: string): CommandBuilder {
		this.addArg(option);
		this.addArg(value);
		return this;
	}

	public addQuotedOption (option: string, value: string): CommandBuilder {
		this.addArg(option);
		this.addArg({
			value,
			quoting: ShellQuoting.Strong
		});
		return this;
	}

	public addFlag (flag: string): CommandBuilder {
		this.addArg(flag);
		return this;
	}
	public addArgs (args: Array<string>): CommandBuilder {
		for (const arg of args) {
			this.addArg(arg);
		}
		return this;
	}

	public addEnvironmentArgument(option: string, value: string, quote = false, environmentName = option.replace(/-/g, '').toUpperCase()): CommandBuilder {
		this.environmentOptions[environmentName] = value;
		this.addOption(option, this.toEnvironmentArg(environmentName, quote));

		return this;
	}

	public resolve (): Command {
		return {
			command: this.command,
			environment: this.environmentOptions,
			args: this.args.map(arg => {
				return arg.quoting === ShellQuoting.Strong ? `"${arg.value}"` : arg.value;
			})
		};
	}
}
