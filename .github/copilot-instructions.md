# Lantern - VS Code Extension

Lantern is a VS Code extension that helps developers distinguish between many different VS Code windows, but allow to set a different color for either the title bar, status bar, activity bar, or a status bar indicator of each window.

## Features

- User has to explicitely activate the colorization feature for each project/workspace using the command palette "Lantern: Assign unique color". This will pick up a random hue using oklch color space and the current saturation and lightness values of the target element (status bar indicator, title bar, status bar, activity bar), and ask where to save the settings (global user settings [default] or workspace settings). This command can be run multiple times to get a different color for the same project/workspace.
- The extension will then apply the color to the selected element of the VS Code UI. For the status bar indicator, it creates a colored circle icon in the status bar without modifying any workspace color settings.
- User can switch between different target elements using the command "Lantern: Choose visualisation". This allows changing which UI element to colorize and optionally reset current colors before switching.
- User can optionally enable Philips Hue integration to sync the color with a Philips Hue light bulb, allowing the light bulb to change color when switching between projects/workspaces. To do that, the user has to run the command "Lantern: Enable Philips Hue integration" and follow the instructions to connect to their Philips Hue bridge and choose which light(s) to control (one or more can be selected).

## Configurable settings

- Choose which part of the VS Code UI to colorize: status bar indicator (default), title bar, status bar, activity bar.
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
- Use lowercase snake case for file names, like `color-utils.ts`
- Use built-in Node.js modules and avoid external dependencies where possible. Ask before using any external libraries.
- Use Node.js built-in test module for unit tests, and ensure core functionality is well-tested.
- Configure prettier for code formatting, with 2 spaces for indentation, bracket spacing, semicolons, single quotes and 120 character line length. Use `package.json` file for configuration.
- Prefer functions over classes for utility code, and keep functions small and focused.

## Tasks

- When needed, update `README.md` and `.github/copilot-instructions.md` files to reflect new features or changes.
- Avoid using comments in the code, except for complex logic that needs explanation.
- Code should be kept clean, simple and readable.
