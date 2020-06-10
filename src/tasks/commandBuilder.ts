import { ShellQuotedString, ShellQuoting } from 'vscode';

export class CommandBuilder {
	private readonly args: ShellQuotedString[] = [];

	public static create (...args: (string | ShellQuotedString | undefined)[]): CommandBuilder {
		const builder = new CommandBuilder();

		if (args !== undefined) {
			for (const arg of args) {
				builder.addArg(arg);
			}
		}

		return builder;
	}

	private addArg (arg: string | ShellQuotedString | undefined): CommandBuilder {
		if (typeof (arg) === 'string') {
			if (arg) { // Quoted strings can be added as empty, but withArg will not allow an empty string arg
				this.args.push(
					{
						value: arg,
						quoting: ShellQuoting.Escape
					}
				);
			}
		} else if (arg !== undefined) {
			this.args.push(arg);
		}

		return this;
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

	public resolve (): string {
		return this.args.map(arg => {
			return arg.quoting === ShellQuoting.Strong ? `"${arg.value}"` : arg.value;
		}).join(' ');
	}
}
