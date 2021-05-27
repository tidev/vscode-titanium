import { viewSuggestions } from './common';
import { BaseDefinitionProvider } from './baseDefinitionProvider';

export class ViewDefinitionProvider extends BaseDefinitionProvider {
	protected suggestions = viewSuggestions;
}
