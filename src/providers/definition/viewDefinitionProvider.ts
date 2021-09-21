import { viewSuggestions } from './common';
import { BaseDefinitionProvider } from './baseDefinitionProvider';

export class ViewDefinitionProvider extends BaseDefinitionProvider {
	protected override suggestions = viewSuggestions;

	protected override wordRangeRegex = /[\w-_]+|L\(['"]\S+['"]\)/;
}
