# Appcelerator Titanium Package for Visual Studio Code

Appcelerator Titanium build tools for [Visual Studio Code](https://code.visualstudio.com).

## Installation 

### Development

* ``cd /path/to/extension`` and run ``npm inatall``
* Open project in VS Code
* Debug > Run. This will open a VS Code window with extension loaded

### Testing

* Create symlink to ``~/.vscode/extensions/``
* ``cd /path/to/extension`` and run ``npm inatall``
* Restart VS Code

## Status

Feature                             | Status    | Notes
---                                 | ---      	| ---
**Project support**                 | 🔜        |
App                               | 🔜        |
Native module                     | ⛔️        |
**Build**                           | 🔜        | VS Code does not allow a custom toolbar, interaction through command palette
Keymap                            | ✅        |
Command palette                   | ✅        |
Console output                    | ✅        | Using built-in console
Local development (iOS)           | ✅        |
Local development (Android)       | ✅        |
Distribution (iOS)                | 🔜        |
Distribution (Android)            | ⛔️        | Need to look at entering keystore credentials
**Project creation**                | ⛔️        |
**Alloy component generation**      | ⛔️        |
**Editor tools**					      | 🔜		|
Code highlighting					| ⛔️		| Built-in support for JS and XML, need launguage support for TSS
Code completion	                | ✅        | Functionally complete but needs some refactoring
Generate code completions list    | ⛔️		|
Jump to definition  	            | ✅		   | Path values are not highlighted correctly; images are previewed on hover
Open related files                | ✅		   |
Snippets							| ✅		   |

