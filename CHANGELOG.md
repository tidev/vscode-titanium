# [1.1.0](https://github.com/tidev/vscode-titanium/compare/v1.0.1...v1.1.0) (2023-04-19)


### Bug Fixes

* check if workspace trust is enabled when determining trust status ([3dfba26](https://github.com/tidev/vscode-titanium/commit/3dfba26112500def68deb9c6500289bf4b29160f))


### Features

* add environment issues handling ([d1082db](https://github.com/tidev/vscode-titanium/commit/d1082dba465c5e00f06f933fc13976116f167535))
* **explorer/build:** only show relevant build options when module project is selected ([f6a7208](https://github.com/tidev/vscode-titanium/commit/f6a7208de1a6dbbabcef4befc8576ad41ff3b940)), closes [#993](https://github.com/tidev/vscode-titanium/issues/993)

## [1.0.1](https://github.com/tidev/vscode-titanium/compare/v1.0.0...v1.0.1) (2022-08-05)


### Bug Fixes

* **explorer/help:** update VS Code documentation link ([#1022](https://github.com/tidev/vscode-titanium/issues/1022)) ([4514f6c](https://github.com/tidev/vscode-titanium/commit/4514f6cc831bc77d6a9ba5a4526bdbd6af9db518))
* **updates:** output error to output channel and allow viewing it ([99d86d8](https://github.com/tidev/vscode-titanium/commit/99d86d86bd170381d5fb1947341e5f06441a9bdb))

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.0.0](https://github.com/tidev/vscode-titanium/compare/v0.14.0...v1.0.0) (2022-03-28)


### ⚠ BREAKING CHANGES

* Changes extension id, extension is now published under a new id and so will have
to be reinstalled

### Features

* add commands to allow the legacy extension to import data during the migration walkthrough ([c99a3ad](https://github.com/tidev/vscode-titanium/commit/c99a3adbe46eb45752814faec0e40141200cb0c0))


### Bug Fixes

* need to apply to global settings ([50c191b](https://github.com/tidev/vscode-titanium/commit/50c191b2b56e53bed53f770733def0e8c9c1b631))


* extension related changes for tidev change ([1114175](https://github.com/tidev/vscode-titanium/commit/1114175d24a5e5e3aef18d5b90f53e1a9d305d53))

## [0.14.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.13.0...v0.14.0) (2022-03-02)


### ⚠ BREAKING CHANGES

* Appc CLI is no longer supported

### Bug Fixes

* update dependency to fix keystore creation ([52571b4](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/52571b4a5d23f7d5cb9211fc2a22818172ff18d7))


* only support titanium tooling ([15cd6e3](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/15cd6e3a9614aadf01de1b8513a78fe162989aea))

## [0.13.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.12.4...v0.13.0) (2021-11-04)


### Features

* **explorer/recent:** allow removing all recent builds ([bc63b1b](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/bc63b1b7566df0a88a098b381c18fb82a4c68fac)), closes [#889](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/889)
* add TerminalLinkProvider to support opening files from stacktraces ([#870](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/870)) ([504ff41](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/504ff41d2a62fa0e1f0aff358689858ea9767769))


### Bug Fixes

* reduce activation events ([#888](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/888)) ([a1628ea](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/a1628eac6548247a8c5a4cb9e2e5c92273c9ef3a)), closes [#887](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/887)

### [0.12.4](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.12.3...v0.12.4) (2021-09-28)


### Features

* **providers/completion:** support import suggestions ([f041715](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/f041715a523a6d8321e9b48ed6a4c52a2fe48879))
* **providers/completion:** support suggesting custom tags ([9238528](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/9238528a228656ecd2fe4e78c5ab25d36551e38b))
* **providers/definition:** support ES6 import file lookups ([#844](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/844)) ([7752c22](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/7752c228c14e30ba7df0c7a093b6ea5273a51fe2)), closes [#843](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/843)
* **providers/definition:** support navigating to a custom tag based on the module property ([aca634b](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/aca634b8d066f67e73bb19b33fc7888258facf62))


### Bug Fixes

* **providers:** improve attribute detection ([05f6657](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/05f66570b4dc8b267cd678c567a3d1e6c11bdd1d))
* **providers/definition:** correctly parse out individual classes from view tags ([71d4f56](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/71d4f561c7509d801d97323703837ff41e84f380)), closes [#848](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/848)

### [0.12.3](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.12.2...v0.12.3) (2021-09-17)


### Features

* **related:** support opening a typescript file ([e5ee5d0](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/e5ee5d0f8257448d68764c605a5833d963eab211)), closes [#820](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/820)
* add keystore creation and keystore information storage ([#752](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/752)) ([c5cd65c](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/c5cd65c632ed942ec1ca5147935c3997de73feac)), closes [#89](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/89)


### Bug Fixes

* **providers:** support TypeScript files in controller completions ([3f7f5aa](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/3f7f5aa04a6708062b0a7b63ae6b5fa5263cfe38))
* **providers/definition:** handle event handlers that are variable declarations ([3a7a0b0](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/3a7a0b0566b3dd97955c0c4d05c8fd2c5ca5e1f8)), closes [#841](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/841)
* **related:** prefer TypeScript source files ([be10b1a](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/be10b1a96c2e968194c763b2e216aaff749d4780))

### [0.12.2](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.12.1...v0.12.2) (2021-06-14)


### Bug Fixes

* **debugger:** support breakpoints in widget lib files ([bb24ffd](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/bb24ffd3ea9d060e08bb8898609a5ba5162f8755)), closes [#140](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/140)
* **providers/definition:** correctly resolve widget and controller files on Windows ([b80f2a6](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/b80f2a662f461935285e6c06ca16a36c6905d41a))
* **providers/view:** fix issues when providing definitions that included punctuation ([a09fb53](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/a09fb53615ddb7e7f707f8f038611f050d81cafa))
* **updates:** update editor commons to fix passing of error metadata ([4e4bb44](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/4e4bb44cdee861dd667cd1606739d6d1f3139c8b)), closes [#741](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/741)

### [0.12.1](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.12.0...v0.12.1) (2021-06-03)


### Bug Fixes

* **updates:** select Titanium SDK after installing it ([0ecec2f](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/0ecec2f7a98b3aa5d6d4032439b445ec03e0e292))

## [0.12.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.11.0...v0.12.0) (2021-06-01)


### ⚠ BREAKING CHANGES

* Raises the minimum VS Code version to 1.56.0

### Features

* add a command to generate a task for a device or distribution target ([fe62bee](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/fe62bee3e64f1d587087641d2164df9e4f9f0bb4))
* add support for vscode workspace trust configuration ([618a9b9](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/618a9b94ef3aa4a8a67f0041724530a09fbe476e))
* declare extension as incompatible with virtual workspaces ([eeda808](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/eeda808046d3291b2b0e0768a4701d9d8b91f97c))
* **commands:** support multi-root workspaces ([cdc86b2](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/cdc86b24c3bc9206eaa4fc063f42ac018d44c1e0))
* **create:** support opening created project in open workspace ([5511400](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/5511400edf974ce2326bbd8e12691e64b9064bb2))
* **explorer/build:** add recent builds section ([ecdf45c](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/ecdf45c3724ed79332f515ff6613aab519cbad6e)), closes [#643](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/643)
* **explorer/build:** display packaging options ([6d12555](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/6d125559e9396e620d3ca0f9630358abdf757d5e)), closes [#642](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/642)
* **providers:** support multi-root workspaces ([c861d27](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/c861d27c50b701e71371182d77f0a390fdcdad8c))
* **tasks:** support multi-root workspaces ([265471d](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/265471ded85b3bb0be3836eca28493773bcc7308))
* **tasks:** support passing arguments as environment variables ([691eaa5](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/691eaa5c9063ba1cb9454d0629d27b7547bec4ae))


### Bug Fixes

* **completions:** correctly format path for js files when running on Windows ([86ae13c](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/86ae13ca9e418364e8104db33e8e29c2c58304f2))
* **completions:** correctly get tag name when providing event name completions ([3ca1e77](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/3ca1e77dd9522510166eb5b6a568e27a3589a1ae))
* **completions:** improve detection of tags when providing view suggestions ([33af87f](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/33af87feefee12abf2f2f29a9e78d268e253122b))
* **create:** always display platform selection, error if none chosen ([65150c7](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/65150c7e59fc8568c8237be8b8695c77c60c3d90))
* **create:** correctly handle force for alloy creation, error is project exists and force not chosen ([a170b2c](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/a170b2cbe015db95b92946a1f6b03a12e9cd48a4))
* **debug/android:** improve reliability of Android debug attachment ([ba6bd7a](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/ba6bd7aa910e17753c597d8d571950b5b1a5d46b))
* **debugger:** correctly resolve projectDir when debugging if not specified ([c2bb757](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/c2bb757b155a2d92d1becef11dbe9618076d7dee))
* **explorer/help:** correctly reveal updates node when explorer hasn't been shown yet ([b1f4aa1](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/b1f4aa1c2a817b210468d01dd731cb8326ced751))
* **package:** handle when package task is not triggered from a tree node ([0f5c810](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/0f5c81084b0ebf0c417ad0313ef0dab27b3c8ddb))
* **package:** pull target off node if called via explorer node ([8720407](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/87204073b3b37f8117832c444d4d8e229dc346dd))
* **package:** stop a running package if called while one is running ([974bf7e](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/974bf7e0ddd5f0a6bd7b9a650ce49de5e6cb971c))
* **providers:** correct alloy app path when searching for images ([fad06c1](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/fad06c1ce8a9f1272ef17891df99061eb247a188))
* **providers:** ignore Alloy.CFG when providing Alloy namespace completions ([47b066f](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/47b066ff18dc2d52408dd5164bce766e9015c17d))
* **providers/code-action:** dont call splice if app.tss is not in the suggestionfiles ([2d9bb9d](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/2d9bb9d13218922da2c90b481961e219f2847496))
* **related:** correct detection of whether file is within current project ([a909431](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/a9094319119b1e8109b309606f02f385dae105c5))
* correctly set projectDir when using last build state ([bbd3e9f](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/bbd3e9f5d1b716af3f025a77f8d7e3bf1478f985))
* instantiate recentBuilds from workspace state on ExtensionContainer creation ([9975f70](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/9975f7095ea0da1059ece34ce70f6b331e5489cd))

## [0.11.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.10.0...v0.11.0) (2021-05-18)


### ⚠ BREAKING CHANGES

* Removes the Generate Completions command as it is no longer required to regenerate completions manually, and removes the Init command as it is also no longer required
* Removes the item in the status bar that displayed the app name and sdk version and the command that would open the project on the platform

### Features

* support using OSS tooling ([49f6e8e](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/49f6e8e2167c965e1d68b8228beb86aef22f803d))
* **explorer:** add new help and feedback view ([#579](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/579)) ([f8e0382](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/f8e0382b658857005051ea6cd05446e08d19f12e))
* add welcome view for no titanium project open state ([e43fc63](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/e43fc63e86b65cc422e50275290b64b047276f92))
* add welcome view for no tooling installed state ([8ff9a6c](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/8ff9a6c024d407709fed140574fb4151900742e5))
* surface error from environment detection if one occurs ([4c3de15](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/4c3de151071877c4143ef496b0bee0ff4175608b))


### Bug Fixes

* **debugging:** adapt to iOS 13.4 changes for displaying variables in debugger sidebar ([ddf183a](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/ddf183a22b2ec49de5e9f1d5e92c5956f1ce47d5))
* **tasks/build:** check cancellation status before closing terminal ([10feca5](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/10feca5d18b10651fff7f825f900403c5bfa5e69))
* **updates:** close update progress when finished ([2f5fc62](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/2f5fc62680515c83f120c7f37e2247013dd83ad2))
* **updates:** only install selected updates ([1007886](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/10078869684ad409a60e6dfcaaa658c8c9935550))


* remove statusbaritem and associated command ([977ce56](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/977ce5662015e8486b36ec277de2faf9da494d14))
* remove unnecessary commands ([ed7cff9](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/ed7cff9a564e53019e9cab3f821c5066a2d3f4ce))

### [0.10.1](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.10.0...v0.10.1) (2021-02-16)


### Bug Fixes

* **completions:** generate v3 of alloy and titanium for completions ([2cda50c](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/2cda50c1ae0ea48dfaa66e0230bb5ae60d48fec8))
* **quickpick:** return array from quickpick if canPickMany is true ([5e40520](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/5e405203ff7974ff3504a72325c5a29b19ce0047))

## [0.10.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.9.0...v0.10.0) (2020-11-16)


### ⚠ BREAKING CHANGES

* **tasks:** Minimum VS Code version is now 1.49.0

Closes EDITOR-48

### Features

* generate debugging and tasks docs ([a0b75c6](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/a0b75c657d5816ae8bf797c75a613233906fa031))
* **build:** allow refreshing on device list during build ([ed2e359](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/ed2e359c02e28c36559e9bf256f7d16a735503f8))
* **create:** allow setting a default path for project ([ae5eec8](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/ae5eec8d237c86fd327b76275f5b76bbe309cd7a))
* **create:** allow setting path when creating projects ([352f6e1](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/352f6e199f3de64478c1b799b8086b6a3b7d8651))
* **create/module:** support selecting android and ios codebase ([0d5d169](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/0d5d1697d1378bcaf854a136f9e5b4d2abd5bc30))
* **explorer:** always show run button, stop running build if clicked ([8631b8e](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/8631b8edf865d33b99b5475c3abbca5876ed1397)), closes [#436](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/436)
* **tasks:** allow usage of variables in task definitions ([9fad8d6](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/9fad8d654dc0f40b0ed9462da90ec0759f5b6427))
* **update:** install Node.js when required ([#406](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/406)) ([f4ed53f](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/f4ed53f04663158de6e178ceb5b283ad1345d925))


### Bug Fixes

* addded sudo to the command as it has been removd from commons ([24ca92b](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/24ca92b70205d139052b0c7212f03041dd0c1d0d))
* wait for a moment before starting the new build ([c378687](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/c378687c1a0d3cfa2b8343089021be3adc9dd11c))
* **completions:** read only properties are not shown ([#488](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/488)) ([3068723](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/30687234374e9652ab150ffd442f78a1df448067))
* **create/module:** always refresh environment information ([7778f48](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/7778f480b53e229db9e15cfede458f034dfc95bf))
* **creation/module:** get environment info if we haven't already got it ([63adae4](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/63adae41736cc0fb7f49b26a0cbad62c5e9c9eb6))
* **explorer/build:** handle no environment info loaded ([0a68a00](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/0a68a00978ab1cb6b3acb4e1d5c3f9f838900429))
* **package/android:** respect keystore settings ([ae52c36](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/ae52c3648d81db96e6ed59abdebff728aaea76de)), closes [#438](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/438)

### [0.9.1](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.9.0...v0.9.1) (2020-09-16)

## [0.9.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.8.0...v0.9.0) (2020-07-02)


### Features

* added ability to output iOS App Store builds to Xcode ([#341](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/341)) ([4d1b9fe](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/4d1b9fe8061a96a9cb97e3e797534e8d47e19fca)), closes [#338](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/338)
* allowed simulatorVersion to be set on iOS tasks ([#327](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/327)) ([ffbb617](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/ffbb617ae4934011210135eac43f28e3ca721f70))


### Bug Fixes

* **packaging:** allow selecting folders during packaging ([c28a02b](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/c28a02b9bc99ce891bbe95ae415a13a996aa8661)), closes [#337](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/337)

## [0.8.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.7.1...v0.8.0) (2020-06-18)


### ⚠ BREAKING CHANGES

* **build explorer:** Windows devices and emulators will no longer be detected
* **debugger:** Setting deviceId and target in a launch configurations is no longer supported. Use the preLaunchTask to set targets and device details or use the prompting flow

### Features

* **commands:** add option to rerun build and package commands on error ([#314](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/314)) ([6d80c19](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/6d80c197f7c456df5b99b2cc1cbc442123c6a63d))
* **debugging:** allow starting a debug session from build explorer ([4905f78](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/4905f7859a901fd9a978ddbca2d57ed65bc232c3))
* **tasks:** resolve keystore relative to task folder ([1949670](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/1949670ab8a69598c7306cf63155fd83c5139a98))
* added extra arguments functionality and definitions ([#322](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/322)) ([6640eff](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/6640effedccf5156d524eabd897dcdf2b8ddcaa4))
* contribute task providers ([#257](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/257)) ([4921d29](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/4921d29c159b4ff987cb9731bca9aefffe868a1e))


### Bug Fixes

* **action-provider:** re-enable view code action provider ([#247](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/247)) ([207b952](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/207b9522141cff7e68f167c4cb19a2060c801d33)), closes [#162](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/162)
* **generate:** fixed typo in alloy generate components ([#265](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/265)) ([e4e8822](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/e4e8822cd4a1b4c0753f9226b38fce43be4f4955))
* **tasks:** allow cancelling task using ctrl+c ([cd0352f](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/cd0352f85c41a3e81c901c97b45e64d3a55e4671))
* **tasks:** respect global liveview setting ([172ec8c](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/172ec8c5bda67caa039073923a73d92fd122d5d3))
* **build explorer:** only show right click build on nodes ([faccb35](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/faccb35a892d4d08442e88dbaf355645ba5de7e5))

### [0.7.1](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.7.0...v0.7.1) (2020-04-06)


### Features

* **definition/controller:** fix lookup when path contains app ([#227](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/227)) ([1072455](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/1072455e9cefd3bf40f9f19ab3c741867870cbc6)), closes [#226](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/226)


### Bug Fixes

* **build:** correct logic for prompting ([95a8878](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/95a88789bbdf5b2b584b6d29232e87227b3b4ab4))
* **commands/run:** only do certificate name check when targeting device ([a1961c7](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/a1961c7edc48bcf35fc623b3e7df0c11a4e9e92a))
* **completion/style:** check length of rule results not existence ([37e2980](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/37e298024054ac75965d2079210e4c80bb52197b))
* **debug/ios:** obtain correct certificate name ([83844df](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/83844df8a5146cc672ab3e38ce24209a6a6bc894)), closes [#166](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/166)
* **debugging/android:** correctly assign default port ([0cf2bd7](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/0cf2bd79f61fc941bd0a51d75c75b57f526a89b5))
* **providers:** improve image file path completions ([c02e6cc](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/c02e6cc4611942b16936b1bef299e69b73c1bb88)), closes [#176](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/176)
* **providers:** improve require completions ([1dc2c82](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/1dc2c827c610b672fcf7ffcc47192a70eb466e21))

## [0.7.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.6.1...v0.7.0) (2019-11-07)


### Bug Fixes

* **build/ios:** dont prompt for cert info if we already have it ([5439414](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/5439414))
* **debugger:** add support for platform specific breakpoints ([#144](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/144)) ([87ac694](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/87ac694))
* fixed value completions in tss and views with word fragment ([#153](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/153)) ([d43e180](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/d43e180)), closes [#150](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/150) [#155](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/155)


### Features

* add clean to command palette ([#145](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/145)) ([0ea8420](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/0ea8420)), closes [#141](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/141)
* **completions:** added completions for Alloy namespace in cont… ([#134](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/134)) ([578cd8a](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/578cd8a)), closes [#133](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/133)
* **ios:** support usage of Apple certificates ([6192056](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/6192056)), closes [#147](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/147)

### [0.6.1](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.6.0...v0.6.1) (2019-10-01)


### Bug Fixes

* ensure correct drive letter is used when normalizing path ([bac6f8a](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/bac6f8a)), closes [#142](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/142)

## [0.6.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.5.0...v0.6.0) (2019-09-27)


### Bug Fixes

* fixed issue where ti.ui.size/fill were missing ([#128](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/128)) ([ae12980](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/ae12980)), closes [#122](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/122)
* **windows:** normalize drive letter before passing path to cli ([d08138a](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/d08138a)), closes [#124](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/124)
* set default publisherID to null ([ebacd90](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/ebacd90))


### Features

* **build:** add support for building to Windows ([2a8e2be](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/2a8e2be))
* **explorer/device:** sort Windows Mobile Emulators by OS version ([191a2f3](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/191a2f3))
* **packaging:** add support for packaging windows apps ([d5d5aa1](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/d5d5aa1))

## [0.5.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.4.0...v0.5.0) (2019-08-21)


### Bug Fixes

* **creation:** show output when error occurs during creation ([#121](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/121)) ([f291b26](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/f291b26)), closes [#107](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/107)
* **tmlanguage:** fixed highlighting when using comments in tss ([#120](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/120)) ([6a3ea30](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/6a3ea30)), closes [#114](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/114)


### Features

* add support for debugging Titanium applications ([#116](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/116)) ([5923ae1](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/5923ae1))

## [0.4.0](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.3.2...v0.4.0) (2019-07-17)


### Bug Fixes

* ensure progress notification is continuous ([f78397a](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/f78397a))
* **autocomplete:** check if there are multiple sdks in tiapp ([#91](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/91)) ([47e8f66](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/47e8f66)), closes [#79](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/79)
* **creation:** use fsPath when dealing with selected directory ([17e2be6](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/17e2be6)), closes [#108](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/108)
* **definition:** fixed go to definition for event handlers ([#96](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/96)) ([e70dbdc](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/e70dbdc)), closes [#94](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/94)
* **project:** add feedback for tiapp validation ([#97](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/97)) ([5527dc5](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/5527dc5)), closes [#95](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/95)
* **textmate:** fixed syntax highlight for alloy.cfg ([#104](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/104)) ([da1798c](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/da1798c)), closes [#103](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/103)
* **updates:** fix message on single update message ([71d51fb](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/71d51fb))
* **updates:** handle error properly in update check ([bb527fb](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/bb527fb)), closes [#100](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/100)
* **validation:** correct verbiage on fail message ([0b39031](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/0b39031)), closes [#88](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/88)


### Features

* **explorer:** add update checks for components ([e193754](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/e193754))
* prompt to install apps sdk if not installed ([bec5204](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/bec5204))
* validate environment on startup ([f615f3d](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/f615f3d))
* **explorer/updates:** change explorer text when checking for updates ([96ce5b7](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/96ce5b7))
* **package/android:** prompt for keystore key password ([#92](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/92)) ([73048bd](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/73048bd))



<a name="0.3.2"></a>
## [0.3.2](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.3.1...v0.3.2) (2019-05-01)


### Bug Fixes

* **providers:** added auto close for quotes and brackets for tss ([#76](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/76)) ([bfedfe1](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/bfedfe1))
* **providers:** fix the link for the widget identifier ([#75](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/75)) ([fbd06c6](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/fbd06c6)), closes [#62](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/62)



<a name="0.3.1"></a>
## [0.3.1](https://github.com/appcelerator/vscode-appcelerator-titanium/compare/v0.3.0...v0.3.1) (2019-04-01)


### Bug Fixes

* **package:** pass project directory into package arguments ([#71](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/71)) ([0027ec3](https://github.com/appcelerator/vscode-appcelerator-titanium/commit/0027ec3)), closes [#70](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/70)



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
