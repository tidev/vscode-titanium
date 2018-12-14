# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="0.1.2"></a>
## [0.1.2](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.1.1...v0.1.2) (2018-12-14)


### Bug Fixes

* **build/ios:** correctly provide cert when building to iOS device ([f4229ae](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/f4229ae))
* **completions:** handle case where project sdk is not installed ([489023f](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/489023f)), closes [#27](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/27)
* **definition:** reinstate hover provider, fix go to definition ([90ae10b](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/90ae10b))
* **package/ios:** do not pass output dir for app store builds ([2ea4346](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/2ea4346))
* add spacing between sim device and version ([#29](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/29)) ([18dfc38](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/18dfc38))



## [0.1.1](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.1.0...v0.1.1) (2018-12-13)


### Bug Fixes

* **completions:** fix bad reference to variable ([ea0cc9e](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/ea0cc9e))
* fix issue when no workspace root, only register alloy when enabled ([6df22b7](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/6df22b7))



# [0.1.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/ffa6f61...v0.1.0) (2018-12-13)


### Bug Fixes

* **commands:** handle not logged in error correctly ([79c6432](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/79c6432))
* **completion:** Return all properties if we don't match ([4dd21c8](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/4dd21c8))
* **completions:** only enter necessary text on sdk insertion, show supported platforms for modules ([d3eab43](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/d3eab43))
* **completions/tiapp:** Trigger SDK completion on '.', filter by existing text, cleanup module code ([9249e3c](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/9249e3c))
* **explorer:** Call setContext with liveview state on startup ([ec7005d](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/ec7005d)), closes [#17](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/17)
* **terminal:** Handle no active terminal, handle closing the terminal we create ([7998d74](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/7998d74))
* conform to eslint, remove eslint-react deps ([d6b424d](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/d6b424d))
* remove "moment" dependency ([ffa6f61](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/ffa6f61))
* spacing on status-bar ([f632adf](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/f632adf))


### Features

* **build:** Allow enabling LiveView during build ([a5ce732](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/a5ce732))
* **build:** Start of Windows support ([#18](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/18)) ([728a839](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/728a839)), closes [#12](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/12)
* **creation:** Add application and module project creation ([d69f3ac](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/d69f3ac))
* **explorer:** Add an inline icon for packaging ([e07ac76](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/e07ac76))
* **explorer:** Allow changing log level from explorer ([20afa0b](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/20afa0b))
* **generate:** Add Alloy component generation ([fe41182](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/fe41182))
