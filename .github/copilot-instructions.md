# Lantern - VS Code Extension

Lantern is a VS Code extension that helps developers distinguish between many different VS Code windows by setting a unique color for the status bar background of each window.

## Features

- User has to explicitly activate the colorization feature for each project/workspace using the command palette "Lantern: Assign unique color". This will pick up a random hue using oklch color space and the current saturation and lightness values of the status bar, and save the settings to global user settings. This command can be run multiple times to get a different color for the same project/workspace.
- The extension will then apply the color to the status bar background of the VS Code UI.
- A status bar indicator (lantern icon) is always visible for quick access to commands, but does not change color.
- User can optionally enable Philips Hue integration to sync the color with a Philips Hue light bulb, allowing the light bulb to change color when switching between projects/workspaces. To do that, the user has to run the command "Lantern: Enable Philips Hue integration" and follow the instructions to connect to their Philips Hue bridge and choose which light(s) to control (one or more can be selected).
- Global toggle functionality: User can quickly enable/disable all Lantern functionality (colored status bar and Philips Hue) using the "Lantern: Toggle on/off" command. This works as a global switch for all workspaces and is separate from other settings.

## Configurable settings

- Choose which color to use for the colorization (default: assigned randomly)
- Enable/disable all Lantern functionality globally (default: enabled).
- Enable/disable Philips Hue integration (default: disabled).
- Choose which Philips Hue light(s) to control (default: none).

## Technical details

- Use the VS Code API to access and modify the color of the status bar background.
- Use TypeScript, ESM and latest Node.js features.
- Color settings are stored in global user settings, with the project path as the key in workspaceColor, ie:
  ```
  "lantern" : {
    "workspaceColor": {
      "/path/to/project": "#ff0000"
    }
  }
  ```
  Alternatively, users can set a workspace-specific color in `.vscode/settings.json`:
  ```
  "lantern" : {
    "color": "#ff0000"
  }
  ```
  If both are set, the workspace-specific color takes priority.
  Other settings like enabling Hue integration will be stored in the same object:
  ```
  "lantern" : {
    "workspaceColor": {
      "/path/to/project": "#ff0000"
    },
    "hueEnabled": true,
    "hueLightIds": ["1", "2"]
  }
  ```
- Use lowercase snake case for file names, like `color-utils.ts`
- Use built-in Node.js modules and avoid external dependencies where possible. Ask before using any external libraries.
- Use Node.js built-in test module for unit tests, and ensure core functionality is well-tested.
- Configure prettier for code formatting, with 2 spaces for indentation, bracket spacing, semicolons, single quotes and 120 character line length. Use `package.json` file for configuration.
- Prefer functions over classes for utility code, and keep functions small and focused.
- Never use `null`, always use `undefined` for optional values or when a value is not set.

## Tasks

- When needed, update `README.md` and `.github/copilot-instructions.md` files to reflect new features or changes.
- Avoid using comments in the code, except for complex logic that needs explanation.
- Code should be kept clean, simple and readable.
- Never use the NPM `package` or `install:vsix` commands they are for human testing only. Use `npm run build` to build the extension and `npm test` to run tests.
