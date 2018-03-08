const related = require('../related');
const definitionProviderHelper = require('./definitionProviderHelper');

/**
 * Style definition provider
*/
const StyleDefinitionProvider = {

	suggestions: [
		{ // id
			regExp: /["']#[A-Za-z0-9_=[\]]+/,
			definitionRegExp: function (text) {
				return new RegExp(`id=["']${text.replace('#', '')}`, 'g');
			},
			files: function (document) {
				return [ related.getTargetPath('xml', document.fileName) ];
			}
		},
		{ // class
			regExp: /["']\.[A-Za-z0-9_=[\]]+/,
			definitionRegExp: function (text) {
				return new RegExp(`class=["']${text.replace('.', '')}`, 'g');
			},
			files: function (document) {
				return [ related.getTargetPath('xml', document.fileName) ];
			}
		}
	],

	/**
	 * Provide completion items
	 *
	 * @param {TextDocument} document active text document
	 * @param {Position} position caret position
	 *
	 * @returns {Thenable}
	 */
	provideDefinition(document, position) {
		return definitionProviderHelper.provideDefinition(document, position, this.suggestions);
	}
};

module.exports = StyleDefinitionProvider;
