<div align="center">
  <img src="./docs/images/icon.png" alt="Lantern icon" width="96" />
</div>

# Lantern - Light up your workspace

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/sinedied.lantern?style=flat-square&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=sinedied.lantern)
[![Build Status](https://img.shields.io/github/actions/workflow/status/sinedied/lantern-vscode-extension/build.yml?style=flat-square&label=Build)](https://github.com/sinedied/lantern-vscode-extension/actions)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

> Distinguish between VS Code windows with unique colors and optional Philips Hue integration

Tired of losing track of which VS Code window you're working in? Lantern helps you distinguish between multiple VS Code instances by assigning unique colors to each workspace's status bar. With optional Philips Hue integration, your physical workspace can also reflect your digital one.

## Features

- **Unique workspace colors**: Assign distinctive colors to each workspace's status bar
- **Random color generation**: Smart color selection using OKLCH color space for optimal visual distinction
- **Manual color selection**: Choose your preferred colors with a built-in color picker
- **Global toggle**: Quickly enable/disable all Lantern functionality across workspaces
- **Philips Hue integration**: Sync your workspace colors with Philips Hue smart lights
- **Persistent settings**: Colors are stored globally and persist across VS Code sessions
- **Always-visible indicator**: Lantern icon in status bar for quick access to commands

## Getting Started

### Basic Usage

1. **Open a workspace** in VS Code
2. **Open Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. **Run command**: `Lantern: Assign random color`
4. Your status bar will now display a unique color for this workspace

The color will automatically be applied whenever you open this workspace in the future.

### Manual Color Selection

Want to choose a specific color? Use the `Lantern: Set color manually` command to open a color picker and select your preferred color.

### Global Toggle

Use `Lantern: Toggle on/off` to quickly disable/enable all Lantern functionality while preserving your color settings.

## Philips Hue Integration

Transform your physical workspace to match your digital one:

1. **Enable integration**: Run `Lantern: Enable Philips Hue integration`
2. **Follow setup**: Connect to your Philips Hue bridge and select lights
3. **Automatic sync**: Your selected lights will change color when switching between workspaces

> [!NOTE]
> Philips Hue integration requires a Philips Hue bridge on your local network and compatible smart lights.

## Commands

Access all Lantern commands through the Command Palette or click the lantern icon in your status bar:

- `Lantern: Assign random color` - Generate a unique color for the current workspace
- `Lantern: Set color manually` - Choose a specific color using the color picker
- `Lantern: Toggle on/off` - Enable/disable all Lantern functionality globally
- `Lantern: Enable Philips Hue integration` - Set up Philips Hue light synchronization
- `Lantern: Disable Philips Hue integration` - Turn off Philips Hue synchronization
- `Lantern: Set Philips Hue intensity` - Adjust brightness of your Hue lights (0-100)
- `Lantern: Reset colors for this workspace` - Remove color assignment for current workspace

## Configuration

Lantern stores settings globally in your VS Code user settings:

```json
{
  "lantern.enabled": true,
  "lantern.hueEnabled": false,
  "lantern.hueLightIds": [],
  "lantern.hueIntensity": 100,
  "lantern.hueDefaultColor": "#000000",
  "lantern.workspaceColor": {
    "/path/to/workspace": "#ff0000"
  }
}
```

For workspace-specific color configuration, you can also add this to your `.vscode/settings.json`:

```json
{
  "lantern.color": "#ff0000"
}
```

> [!NOTE]
> If both `lantern.workspaceColor` (global) and `lantern.color` (workspace-specific) are set, the workspace-specific setting takes priority.

### Settings Reference

| Setting           | Description                                               | Default   |
| ----------------- | --------------------------------------------------------- | --------- |
| `enabled`         | Enable or disable Lantern                                 | `true`    |
| `workspaceColor`  | Global workspace color mappings (workspace path → color)  | `{}`      |
| `color`           | Workspace-specific color (set in `.vscode/settings.json`) | Not set   |
| `hueEnabled`      | Enable Philips Hue integration                            | `false`   |
| `hueLightIds`     | List of Hue light IDs to control                          | `[]`      |
| `hueIntensity`    | Brightness of Hue lights (0-100)                          | `100`     |
| `hueDefaultColor` | Default color when no workspace color is set              | `#000000` |

> [!TIP]
> Use `#000000` as the default Hue color to turn lights off when no workspace color is assigned.

## How It Works

Lantern uses the VS Code API to modify the status bar background color through the `workbench.colorCustomizations` setting. Colors are generated using the OKLCH color space, ensuring optimal visual distinction between workspaces while maintaining good readability.

For Philips Hue integration, Lantern communicates with your Hue bridge using the official Philips Hue API to synchronize colors across your selected smart lights.

## Requirements

- VS Code 1.102.0 or higher
- For Philips Hue integration: Philips Hue bridge and compatible smart lights

## Installation

Install Lantern from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=sinedied.lantern) or search for "Lantern" in the VS Code Extensions view.

## Troubleshooting

### Colors not appearing?

- Ensure `lantern.enabled` is set to `true`
- Check that you've assigned a color using `Lantern: Assign random color` or `Lantern: Set color manually`
- Verify your VS Code theme supports status bar customization

### Philips Hue not working?

- Ensure your Hue bridge is connected to the same network as your computer
- Check that you've completed the bridge authentication process
- Verify the selected light IDs are valid and the lights are powered on

### Need to reset everything?

Run `Lantern: Reset colors for this workspace` to clear color settings for the current workspace, or disable the global toggle to turn off all functionality while preserving settings.
