# Configuration Settings

There are a variety of settings that you can use to customize this extension to your needs. You can find them listed below.

You can learn more about User and Workspace settings in the [VS Code documentation](https://code.visualstudio.com/docs/getstarted/settings).

| Setting name | Description | Default Value |
| ------------- | ------------- | ----- |
| `titanium.android.keystoreAlias` | Keystore alias used for packaging Android applications | `No Default` |
| `titanium.android.keystorePath` | Path to keystore used for packaging Android applications | `No Default` |
| `titanium.build.liveview` | Whether to enable LiveView when building applications | `true` |
| `titanium.codeTemplates.jsFunction` | Event handler function template | `\nfunction ${text}(e){\n}\n` |
| `titanium.codeTemplates.tssClass` | Style class (.) template | `\n'.${text}': {\n}\n` |
| `titanium.codeTemplates.tssId` | Style ID (#) template | `\n'#${text}': {\n}\n` |
| `titanium.codeTemplates.tssTag` | Style tag template | `\n'${text}': {\n}\n` |
| `titanium.general.appcCommandPath` | Set the full path to the `appc` command if VS Code is unable to locate it. | `appc` |
| `titanium.general.displayBuildCommandInConsole` | The executed build command is written to the output channel to aid debugging. This will include password arguments. | `true` |
| `titanium.general.logLevel` | Logging level for commands being run | `info` |
| `titanium.general.updateFrequency` | Controls the frequency for how often to show an alert if there are updates available. Updates can always be viewed in the Titanium activity pane. Accepts values in time formats like 60 minutes, 12 hours, 7 days etc. | `1 day` |
| `titanium.general.useTerminalForBuild` | When true build/package commands will be run using the integrated terminal as opposed to using an output channel. | `true` |
| `titanium.package.distributionOutputDirectory` | Output directory for package builds. | `dist` |
| `titanium.project.defaultI18nLanguage` | Default language to use for i18n autocomplete. | `en` |
