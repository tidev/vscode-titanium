# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="0.3.0"></a>
# [0.3.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.2.0...v0.3.0) (2019-03-28)


### Bug Fixes

* **alloy/generate:** handle opening widget files ([#59](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/59)) ([fab426d](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/fab426d)), closes [#55](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/55)
* **build:** last target undefined ([#65](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/65)) ([9471756](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/9471756)), closes [#57](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/57)
* **build/module:** pass project dir and build only on module build ([#68](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/68)) ([4ed8907](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/4ed8907)), closes [#67](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/67)
* **create:** pass in log level to create argument builder ([#61](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/61)) ([9f09ab9](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/9f09ab9)), closes [#60](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/60)
* **create/model:** add adapter type to model creation ([#64](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/64)) ([95b7259](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/95b7259)), closes [#58](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/58)


### Features

* **build:** added the output channel option ([#63](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/63)) ([23e0677](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/23e0677)), closes [#33](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/33)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.1.4...v0.2.0) (2019-03-07)


### Bug Fixes

* remove scope from logLevel to add back to preferences menu ([491974c](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/491974c))
* **package:** correct last build state for android ([#52](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/52)) ([26357e0](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/26357e0)), closes [#47](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/47)


### Features

* **config:** add support for setting default keystore path ([#53](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/53)) ([a0832ac](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/a0832ac)), closes [#51](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/51)



<a name="0.1.4"></a>
## [0.1.4](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.1.3...v0.1.4) (2019-02-20)


### Bug Fixes

* do not attempt to generate completions for module projects ([70f34bd](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/70f34bd))
* handle errors from parsing appc info response ([90cc125](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/90cc125))
* **build:** quote all arguments when constructing the build and package args ([c20cb6a](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/c20cb6a)), closes [#41](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/41)
* **Windows Targets:** correct windows target names ([#40](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/40)) ([737edf9](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/737edf9))



<a name="0.1.3"></a>
## [0.1.3](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.1.2...v0.1.3) (2018-12-18)


### Bug Fixes

* **build:** only prompt for cert and provisioning profile when building to ios device ([721609d](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/721609d)), closes [#34](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/34)



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
