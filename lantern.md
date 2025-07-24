# Lantern - VS Code Extension

I want to create a VS Code extension that helps developers distinguish between many different VS Code windows, but allow to set a different color for either the title bar, status bar or activity bar of each window.

The name of the extension is "Lantern".

## Features
- User has to explicitely activate the colorization feature for each project/workspace using the command palette "Lantern: Assign unique color". This will pick up a random hue using oklch color space and the current saturation and lightness values of the target element (title bar, status bar, activity bar), and ask where to save the settings (global user settings [default] or workspace settings). This command can be run multiple times to get a different color for the same project/workspace.
- The extension will then apply the color to the selected element of the VS Code UI.
- User can optionally enable Philips Hue integration to sync the color with a Philips Hue light bulb, allowing the light bulb to change color when switching between projects/workspaces. To do that, the user has to run the command "Lantern: Enable Philips Hue integration" and follow the instructions to connect to their Philips Hue bridge and choose which light(s) to control (one or more can be selected). 

## Configurable settings
- Choose which part of the VS Code UI to colorize: title bar, status bar, activity bar (default: status bar).
- Choose which color to use for the colorization (default: assigned randomly)
- Enable/disable Philips Hue integration (default: disabled).
- Choose which Philips Hue light(s) to control (default: none).

## Technical details
- Use the VS Code API to access and modify the color of the title bar, status bar, and activity bar.
- Use TypeScript, ESM and latest Node.js features.
- Color settings are stored by default in global user settings, with the project path as the first part of the key, ie:
    ```
    "lantern" : {
      "/path/to/project" : {
        "titleBar.activeBackground": ""
      }
    }
    ```
  Other settings like enabling Hue integration will be stored in the same object, but common for all projects:
    ```
    "lantern" : {
      "/path/to/project" : {
        "titleBar.activeBackground": "",
      },
      "hueIntegrationEnabled": true,
      "hueLightIds": ["1", "2"]
    }
    ```
- User can also choose to store settings in the workspace settings. This will save the settings in the `.vscode/settings.json` file of the workspace, without the project path prefix:
    ```
    "lantern" : {
      "titleBar.activeBackground": "",
      "hueIntegrationEnabled": true,
      "hueLightIds": ["1", "2"]
    }
    ```
