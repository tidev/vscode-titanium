# Debugging Titanium applications <!-- omit in toc -->

- [Prerequisites](#prerequisites)
	- [General](#general)
	- [Android](#android)
	- [iOS](#ios)
- [Debugging from the Build Explorer](#debugging-from-the-build-explorer)
- [Debugging with Launch Configurations](#debugging-with-launch-configurations)
	- [Generating a debug configuration](#generating-a-debug-configuration)
	- [Specifying a pre-launch task](#specifying-a-pre-launch-task)
	- [Starting a debug session](#starting-a-debug-session)
- [Using the Debug Console REPL](#using-the-debug-console-repl)
- [Further reading](#further-reading)

## Prerequisites

### General

To debug an Alloy application you must be using Alloy 1.14.0 (Appcelerator CLI 7.1.0) or higher.

### Android

There are no prerequisites for debugging an application on Android.

### iOS

- To debug an application on iOS you must install [ios-webkit-debug-proxy](https://github.com/google/ios-webkit-debug-proxy). The latest versions of `usbmuxd` and `libimobiledevice` are required to ensure compatability with the latest iOS versions.
  1. Firstly ensure you have [brew](https://brew.sh/) installed.
  2. Install `ios_webkit_debug_proxy` `brew install ios-webkit-debug-proxy`
- To debug on an iOS device, you must enable the [web inspector in safari](https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/Safari_Developer_Guide/GettingStarted/GettingStarted.html#//apple_ref/doc/uid/TP40007874-CH2-SW8)

## Debugging from the Build Explorer

Once you've installed the prerequisites for debugging, the quickest way to start debugging is to hit the debug icon on a device in the build explorer.

![Debugging an application from the Build Explorer](./images/DebugFromBuildExplorer.gif)

## Debugging with Launch Configurations

Whilst starting a debug session from the Build Explorer is incredibly easy, you might find that you want to configure your debug session. For example, if you want to avoid being prompted for a certificate and provisioning profile when debugging to a device.

### Generating a debug configuration

![Generating Debug Configuration](./images/DebugConfiguration.gif)

First, you must create a debug configuration. To do that:

1. Select the debug icon from the Activity Bar in VS Code
    ![VS Code Debug Icon](./images/DebugIcon.png)
2. Generate a launch configuration file by clicking `create a launch.json` file

    ![Debug View Top Bar](./images/ConfigurationIcon.png)
3. Select `Titanium` from the environment selection list
    ![Debug Environment Selection](./images/EnvironmentSelect.png)

This will automatically generate two debug configurations in `.vscode/launch.json` file, one to debug on Android, one to debug on iOS. You can customise these files using the following properties.

| Property name | Description | Default value |
| ------------- | ------------| ------------- |
| platform | Platform to debug | No Default |
| projectDir | Directory of the Titanium project to debug | [${workspaceFolder}](https://code.visualstudio.com/docs/editor/variables-reference#_predefined-variables) |
| port | Port number to use for the debugger | 9000 |
| preLaunchTask | Name of the task to use to build the application | No Default |

### Specifying a pre-launch task

The `preLaunchTask` property allows setting a task from the `.vscode/tasks.json` file to be used to build the application. This allows you to declare the target and device ID for your build so you won't be prompted for these every build. For documentation on configuring tasks see the [tasks documentation](./tasks.md).

If no `preLaunchTask` is specified, then the default Titanium Debug task will be used. This task will prompt for the target and device ID every build.

When creating a `preLaunchTask` for debugging a Titanium application, the following properties are required to be set on the task:

- `isBackground` must be set to `true`
- `problemMatcher` must include `"$ti-app-launch"`
- `titaniumBuild.debug` must be set to `true`

These properties will be enforced at the start of the debug session and the debug session will error out if they are not set.

### Starting a debug session

![Debugging an application from a Launch Configuration](./images/DebuggingAnApplication.gif)

Once you have generated the debug configuration, you're ready to start debugging your application. To do that:

1. Select the debug icon from the Activity Bar in VS Code
    ![VS Code Debug Icon](./images/DebugIcon.png)
2. Select the debug configuration you wish to use in the dropdown
    ![VS Code Debug Configuration Dropdown](./images/ConfigurationSelect.png)
3. Press the green play button

If you are missing any required information such as the build target and device id you will be prompted for it. Once all the required information is gathered, the build will be started and the debugger will connect when the application is launched on your build target. You can set breakpoints in your code and they will be hit as you step through your application.

**Note**: On Android the debugger will pause on the first line that is executed which will probably not be your code but some internal SDK code. You can press `Continue` or `F5` to continue after it has broke on this line.

## Using the Debug Console REPL

The VS Code debugger offers a [built-in REPL](https://code.visualstudio.com/docs/editor/debugging#_debug-console-repl), this allows you to execute code at runtime in your application. When the application is running normally (i.e. no breakpoint has been hit) this will execute in the global context of your application, this means that you can't reference code from an Alloy controller for example. However, when a breakpoint has been hit the code will execute in the context of the breakpoint, so variables like `$` and code specific to an Alloy controller can be referenced.

## Further reading

You can read more about the functionalities of VS Code debugging in the [VS Code docs](https://code.visualstudio.com/docs/editor/debugging).
