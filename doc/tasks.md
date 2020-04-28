# Using Visual Studio Code Tasks

The Titanium extension contributes two [tasks](https://code.visualstudio.com/docs/editor/tasks#_custom-tasks) to Visual Studio Code to allow you to easily customize your own builds, as well as orchestrate tasks from different sources to ease your development. This document describes how to configure these tasks, and also provides examples of some useful tasks for Titanium development.

## Titanium Build Task

The `titanium-build` task is for building applications and modules during development. All configuration for this task is under a `titaniumBuild` property.

### Common Build Task Configuration

| Property | Description | Default Value | Valid Values|
| -------- | ----------- | ------------- | ----------- |
| `titaniumBuild.deployType` | The `--deploy-type` flag value | None | `deployment` or `test` |
| `titaniumBuild.platform` | The platform to build for | None, prompted for on build | `android` or `ios` |
| `titaniumBuild.projectType` | The project type | None, detected on build | `app` or `module` |
| `titaniumBuild.target` | The target to build for | None, prompted for on build | Android: `emulator` or `device` <br>iOS: `device` or `simulator` |
| `titaniumBuild.ios` | iOS configuration options | None | See [iOS Build Task Configuration](#ios-build-task-configuration) |

### Android Build Task Configuration

There are no Android specific configuration options for the build task.

### iOS Build Task Configuration

| Property | Description | Default Value | Valid Values|
| -------- | ----------- | ------------- | ----------- |
| `ios.certificate` | Certificate name to use when signing device builds | None, prompted for on device builds | N/A |
| `ios.provisioningProfile` | Provisioning Profile UUID to use when signing device builds | None, prompted for on device builds | N/A |

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
| `titaniumBuild.platform` | The platform to build for | None, prompted for on build | `android` or `ios` |
| `titaniumBuild.projectType` | The project type | None, detected on build | `app` or `module` |
| `titaniumBuild.outputDirectory` | Full path to the output directory | None, prompted for if not provided | None |
| `titaniumBuild.target` | The target to build for | None, prompted for on build | Android: `dist-playstore` <br> iOS: `dist-adhoc` or `dist-appstore` |
| `titaniumBuild.android` | iOS configuration options | None | See [Android Package Task Configuration](#android-package-task-configuration) |
| `titaniumBuild.ios` | iOS configuration options | None | See [iOS Package Task Configuration](#ios-package-task-configuration) |

### Android Package Task Configuration

| Property | Description | Default Value | Valid Values|
| -------- | ----------- | ------------- | ----------- |
| `android.keystore.location` | Path to the keystore to use | None, prompted for if not provided | N/A |
| `android.keystore.alias` | Alias for the keystore | None, prompted for if not provided | N/A |

### iOS Package Task Configuration

| Property | Description | Default Value | Valid Values|
| -------- | ----------- | ------------- | ----------- |
| `ios.certificate` | Certificate name to use when signing device builds | None, prompted for on device builds | N/A |
| `ios.provisioningProfile` | Provisioning Profile UUID to use when signing device builds | None, prompted for on device builds | N/A |

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
