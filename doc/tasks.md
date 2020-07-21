# Using Visual Studio Code Tasks

The Titanium extension contributes two [tasks](https://code.visualstudio.com/docs/editor/tasks#_custom-tasks) to Visual Studio Code to allow you to easily customize your own builds, as well as orchestrate tasks from different sources to ease your development. This document describes how to configure these tasks, and also provides examples of some useful tasks for Titanium development.

## Titanium Build Task

The `titanium-build` task is for building applications and modules during development. All configuration for this task is under a `titaniumBuild` property.

### Common Build Task Configuration

| Property | Description | Default Value | Valid Values|
| -------- | ----------- | ------------- | ----------- |
| `titaniumBuild.deployType` | Deploy Type to be used when building | No Default | `test`, `development` |
| `titaniumBuild.deviceId` | ID or UDID for the device or simulator | No Default | N/A |
| `titaniumBuild.extraArguments` | Extra arguments to be used in the build | No Default | N/A |
| `titaniumBuild.platform` | Platform to build for | No Default | `android`, `ios` |
| `titaniumBuild.projectType` | Project type to be built | No Default | `app`, `module` |
| `titaniumBuild.target` | Target to build for | No Default | N/A |
| titaniumBuild.android | Android configuration options | No Default | See [Android Build Task Configuration](#android-Build-task-configuration) |
| titaniumBuild.ios | iOS configuration options | No Default | See [iOS Build Task Configuration](#ios-Build-task-configuration) |

### Android Build Task Configuration

There are no Android specific configuration properties for the Build task.

### iOS Build Task Configuration

| Property | Description | Default Value | Valid Values|
| -------- | ----------- | ------------- | ----------- |
| `titaniumBuild.ios.provisioningProfile` | Provisioning Profile UUID to use when signing device builds | No Default | N/A |
| `titaniumBuild.ios.certificate` | Certificate name to use when signing device builds | No Default | N/A |
| `titaniumBuild.ios.simulatorVersion` | Simulator version use when performing a simulator build | No Default | N/A |

### Sample Build Task Configurations

#### Build for a specific Android emulator

```json
{
	"type": "titanium-build",
	"label": "Build - Android - Pixel 3a XL API 29",
	"titaniumBuild": {
		"platform": "android",
		"target": "emulator",
		"deviceId": "Pixel_3a_XL_API_29"
	},
}
```

#### Build for iOS device with certificate and provisioning profile

```json
{
	"type": "titanium-build",
	"label": "Build - iOS - Device",
	"titaniumBuild": {
		"platform": "ios",
		"target": "device",
		"deviceId": "846564383f42cf576ebe6966800caf83fd588f54",
		"ios": {
			"certificate": "iPhone Developer: Appcelerator (A12345BC6D)",
			"provisioningProfile": "12345678-1a23-1a23-ab6a-1234a5678b9c"
		}
	}
}
```

## Titanium Package Task

The `titanium-package` task is for building distribution versions of applications and modules.

### Package Configuration

| Property | Description | Default Value | Valid Values|
| -------- | ----------- | ------------- | ----------- |
| `titaniumBuild.extraArguments` | Extra arguments to be used in the build | No Default | N/A |
| `titaniumBuild.outputDirectory` | Output directory for the built application | No Default | N/A |
| `titaniumBuild.platform` | Platform to build for | No Default | `android`, `ios` |
| `titaniumBuild.target` | Target to build for | No Default | N/A |
| `titaniumBuild.projectType` | Project type to be built | No Default | `app`, `module` |
| titaniumBuild.android | Android configuration options | No Default | See [Android Package Task Configuration](#android-Package-task-configuration) |
| titaniumBuild.ios | iOS configuration options | No Default | See [iOS Package Task Configuration](#ios-Package-task-configuration) |

### Android Package Task Configuration

| Property | Description | Default Value | Valid Values|
| -------- | ----------- | ------------- | ----------- |
| `titaniumBuild.android.keystore.alias` | Alias for the keystore | No Default | N/A |
| `titaniumBuild.android.keystore.location` | Path of the keystore to be used, must be a full path | No Default | N/A |

### iOS Package Task Configuration

| Property | Description | Default Value | Valid Values|
| -------- | ----------- | ------------- | ----------- |
| `titaniumBuild.ios.provisioningProfile` | Provisioning Profile UUID to be used | No Default | N/A |
| `titaniumBuild.ios.certificate` | Certificate name to be used | No Default | N/A |

### Sample Package Task Configurations

#### Package for iOS dist-appstore

```json
{
	"type": "titanium-package",
	"label": "Package - iOS - AppStore",
	"titaniumBuild": {
		"platform": "ios",
		"target": "dist-appstore",
		"outputDirectory": "/Users/ewan/git/kitchensink-v2",
		"ios": {
			"certificate": "iPhone Distribution: Appcelerator, Inc.",
			"provisioningProfile": "48a8cfb7-17ed-4829-a794-dab384512292"
		}
	}
}
```

#### Package for Android dist-playstore

```json
{
	"type": "titanium-package",
	"label": "Package - Android - PlayStore",
	"titaniumBuild": {
		"platform": "android",
		"target": "dist-playstore",
		"outputDirectory": "/Users/ewan/git/kitchensink-v2",
		"android": {
			"keystore": {
				"location": "/Users/ewan/git/kitchensink-v2/mykeystore",
				"alias": "analias"
			}
		}
	}
}
```

## Orchestrating tasks

Visual Studio Code allows tasks to declare dependencies to create what is known as [compound tasks](https://code.visualstudio.com/docs/editor/tasks#_compound-tasks). By using compound tasks we can run tasks such as linting before the Titanium build process to ensure that our code is valid or start a local development server before building the app. For example, with the following `tasks.json` file the `lint` task will run before the `titanium-build` task, which will take place only if the lint task passed.

```json
{
	"version": "2.0.0",
	"tasks": [
		{
			"type": "titanium-build",
			"label": "Build - Android - Pixel 3a XL API 29",
			"titaniumBuild": {
				"platform": "android",
				"target": "emulator",
				"deviceId": "Pixel_3a_XL_API_29"
			},
			"dependsOn": ["lint"]
		},
		{
			"label": "lint",
			"type": "npm",
			"script": "lint",
			"problemMatcher": [
				"$eslint-stylish"
			]
		}
	]
}
```

## Current Limitations

* [Variable substitution](https://code.visualstudio.com/docs/editor/variables-reference) is unsupported.
* File paths provided in the task configuration have to be full paths.
