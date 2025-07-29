<div align="center">
  <img alt="Lantern icon" src="https://raw.githubusercontent.com/sinedied/lantern-vscode-extension/refs/heads/main/icon.png" width="128">

  # Lantern - Light up your workspace
  *Give your VS Code workspaces unique colors with optional Philips Hue integration*

  [![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/sinedied.lantern?style=flat-square&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=sinedied.lantern)
  [![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

  [Features](#features) • [Installation](#installation) • [Usage](#usage) • [Additional Info](#additional-info) • [Troubleshooting](#troubleshooting)

</div>

Tired of losing track of which VS Code window you're working in? Lantern helps you distinguish between multiple VS Code instances by assigning unique colors to each workspace's status bar. With optional Philips Hue integration, your physical workspace can also reflect your digital one.

## Features

- **Unique workspace colors**: Assign distinctive colors to each workspace's status bar, either manually or randomly using OKLCH color space for optimal visual distinction
- **Philips Hue integration**: Sync your workspace colors with Philips Hue smart lights
- **Quick toggle**: Quickly enable/disable all functionality across workspaces
- **AI-powered color suggestions**: Get intelligent color recommendations based on your project context and preferences using GitHub Copilot

> **Note**: AI features requires [GitHub Copilot](https://github.com/features/copilot) to be enabled in VS Code and your GitHub account. You can get started with GitHub Copilot [for free here](https://github.com/github-copilot/pro).

## Installation

Install Lantern from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=sinedied.lantern) or search for "Lantern" in the VS Code Extensions view.

## Usage

1. **Open a workspace** in VS Code
2. **Open Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. **Run command**: `Lantern: Assign unique color`
4. Your status bar will now display a unique color for this workspace

The color will automatically be applied whenever you open this workspace in the future.

### Manual color selection

Want to choose a specific color? Use the `Lantern: Assign color manually` command to open a color picker and select your preferred color.

### AI-powered color suggestions

> **Note**: AI features requires [GitHub Copilot](https://github.com/features/copilot) to be enabled in VS Code and your GitHub account. You can get started with GitHub Copilot [for free here](https://github.com/github-copilot/pro).

Let AI help you find the perfect color for your workspace! Use the `Lantern: Suggest color with AI` command to get intelligent color recommendations.

The AI considers:
- Your optional inspiration or specific requirements (e.g., "calm and professional", "energetic", "matching my brand colors")
- Current workspace color (if any)
- All other workspace colors to avoid duplicates
- Project context from your README file
- VS Code design guidelines for optimal status bar colors

#### GitHub Copilot tools

Lantern contributes Language Model Tools that GitHub Copilot can use to interact with workspace colors:

- **`setLanternColor`**: Set workspace colors programmatically (workspace can be specified, default to current one)
- **`lanternContext`**: Get current and other workspace colors, along with current project context (extracted from README file)

Open the the GitHub Copilot chat window and select "Agent" mode to use these tools interactively. For example, you can try this prompt: `Use tools to suggest a new color for my workspace`.

### Quick toggle

Use `Lantern: Toggle on/off` to quickly disable/enable all Lantern functionality while preserving your color settings.

### Philips Hue integration

Transform your physical workspace to match your digital one:

1. **Enable integration**: Run `Lantern: Enable Philips Hue`
2. **Follow setup**: Connect to your Philips Hue bridge and select lights
3. **Automatic sync**: Your selected lights will change color when switching between workspaces

> **Note**: Philips Hue integration requires a Philips Hue bridge on your local network and compatible smart lights.

## Additional info

### Commands

Access all Lantern commands through the Command Palette or click the lantern icon in your status bar:

- `Lantern: Assign unique color` - Generate a unique color for the current workspace
- `Lantern: Assign color manually` - Choose a specific color using the color picker
- `Lantern: Suggest color with AI` - Get AI-powered color recommendations based on project context
- `Lantern: Toggle on/off` - Enable/disable all Lantern functionality globally
- `Lantern: Enable Philips Hue` - Set up Philips Hue light synchronization
- `Lantern: Disable Philips Hue` - Turn off Philips Hue synchronization
- `Lantern: Set Philips Hue intensity` - Adjust brightness of your Hue lights (0-100)
- `Lantern: Lantern: Reset workspace color` - Remove color assignment for current workspace

### Configuration

Lantern stores settings globally in your VS Code user settings:

```json
{
  "lantern.enabled": true,
  "lantern.minimal": false,
  "lantern.overrideDebuggingColors": false,
  "lantern.hueEnabled": false,
  "lantern.hueLightIds": [],
  "lantern.hueIntensity": 100,
  "lantern.hueDefaultColor": "#000000",
  "lantern.workspaceColor": {
    "/path/to/workspace": "#be0a0aff"
  }
}
```

For workspace-specific color configuration, you can also add this to your `.vscode/settings.json`:

```json
{
  "lantern.color": "#be0a0aff"
}
```

> **Note**: If both `lantern.workspaceColor` (global) and `lantern.color` (workspace-specific) are set, the workspace-specific setting takes priority.

#### Settings reference

| Setting                     | Description                                               | Default   |
| --------------------------- | --------------------------------------------------------- | --------- |
| `enabled`                   | Enable or disable Lantern                                 | `true`    |
| `workspaceColor`            | Global workspace color mappings (workspace path → color)  | `{}`      |
| `color`                     | Workspace-specific color (set in `.vscode/settings.json`) | Not set   |
| `minimal`                   | Enable minimalistic colorization (status bar item only)   | `false`   |
| `overrideDebuggingColors`   | Override debugging status bar colors with Lantern colors  | `false`   |
| `hueEnabled`                | Enable Philips Hue integration                            | `false`   |
| `hueLightIds`               | List of Hue light IDs to control                          | `[]`      |
| `hueIntensity`              | Brightness of Hue lights (0-100)                          | `100`     |
| `hueDefaultColor`           | Default color when no workspace color is set              | `#000000` |

> **Tip**: Use `#000000` as the default Hue color to turn lights off when no workspace color is assigned.

### Limitations

Lantern uses the VS Code API to change the status bar background color through the `workbench.colorCustomizations` setting. This means the `.vscode/settings.json` file will be dynamically updated to set workspace-specific colors, as it's the only method available for setting individual workspace colors at the moment.

If you don't want to share your Lantern settings with others, you can add the `.vscode/settings.json` file to your `.gitignore` file.

## Troubleshooting

### Colors not appearing?

- Ensure `lantern.enabled` is set to `true`
- Check that you've assigned a color using `Lantern: Assign random color` or `Lantern: Assign color manually`
- Verify your VS Code theme supports status bar customization

### AI color suggestions not working?

- Ensure GitHub Copilot is enabled and authenticated in VS Code
- Check that you have an active Copilot subscription
- Try the command again if the first attempt fails (AI services can occasionally be unavailable)

### Philips Hue not working?

- Ensure your Hue bridge is connected to the same network as your computer
- Check that you've completed the bridge authentication process
- Verify the selected light IDs are valid and the lights are powered on

### Need to reset colors?

Run `Lantern: Reset workspace color` to clear color settings for the current workspace, or use the quick toggle to turn off all functionality while preserving settings.
