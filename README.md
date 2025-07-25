# Lantern VS Code Extension

Lantern helps developers distinguish between many different VS Code windows by setting a unique color for the status bar background of each workspace/project.

## Features

### 🎨 Unique Colors per Workspace

- Assign unique colors to each VS Code workspace using the command palette
- Colors are generated using the OKLCH color space for optimal perceptual uniformity
- Colorizes the **Status Bar** background for clear workspace identification
- Settings can be saved globally (per project path) or per workspace
- A status bar indicator (lantern icon) is always visible for quick access to commands
- Automatically applies colors when opening workspaces or switching between windows

### 🎯 Global Toggle

- Instantly enable/disable all Lantern functionality with a single command
- Works as a global switch - affects all workspaces when toggled
- Separate from other settings - preserves your configurations when disabled
- Quick access through status bar or command palette

### 💡 Philips Hue Integration

- Optional integration with Philips Hue smart lights
- Sync your workspace colors with physical light bulbs
- Automatically change light colors when switching between projects/workspaces
- Support for multiple lights
- Real-time updates when workspace or configuration changes

## Commands

Use the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) to access these commands:

- **Lantern: Toggle on/off** - Globally enable/disable all Lantern functionality
- **Lantern: Assign unique color** - Assigns a random color to the current workspace status bar
- **Lantern: Enable Philips Hue integration** - Set up and enable Hue light synchronization
- **Lantern: Disable Philips Hue integration** - Disable Hue light synchronization
- **Lantern: Reset colors** - Remove color customizations for the current workspace

## Settings

Configure Lantern through VS Code settings:

- `lantern.globalToggleEnabled` - Globally enable/disable all Lantern functionality (default: true)
- `lantern.hueIntegrationEnabled` - Enable/disable Philips Hue integration
- `lantern.hueLightIds` - Array of Hue light IDs to control
- `lantern.hueBridgeIp` - IP address of your Hue bridge (auto-discovered)
- `lantern.hueUsername` - Hue bridge username/API key (auto-generated)
- `lantern.hueDefaultColor` - Default color for Hue lights when no workspace color is set (default: #000000 to turn lights off)

## Usage

### Quick Toggle

For easy on/off control:

1. Click the lantern icon in the status bar, or
2. Use Command Palette: "Lantern: Toggle on/off"
3. This will instantly enable/disable all Lantern functionality across all workspaces
4. The status bar icon remains visible even when disabled for quick toggle access
5. When re-enabled, Hue lights automatically sync to the current workspace color

### Basic Color Assignment

1. Open a workspace/project in VS Code
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run "Lantern: Assign unique color"
4. Choose where to save settings (global or workspace)
5. Your VS Code window status bar will now have a unique color!

### Philips Hue Setup

1. Ensure your Philips Hue bridge is connected to the same network
2. Run "Lantern: Enable Philips Hue integration"
3. Press the button on your Hue bridge when prompted
4. Select which lights you want to control
5. Colors will now sync with your lights when switching workspaces!

## Color Storage

### Global Settings (Default)

Colors are stored in your global VS Code settings with the project path as the key:

```json
{
  "lantern": {
    "/path/to/project": {
      "statusBar.background": "#ff6b6b"
    },
    "hueIntegrationEnabled": true,
    "hueLightIds": ["1", "2"]
  }
}
```

### Workspace Settings

When saved to workspace settings, colors are stored in `.vscode/settings.json`:

```json
{
  "lantern": {
    "statusBar.background": "#ff6b6b"
  }
}
```

## Requirements

- VS Code 1.102.0 or higher
- For Philips Hue integration: Philips Hue bridge and compatible lights

## Extension Settings

This extension contributes the following settings:

- `lantern.globalToggleEnabled`: Globally enable/disable all Lantern functionality (default: true)
- `lantern.hueIntegrationEnabled`: Enable Philips Hue integration (default: false)
- `lantern.hueLightIds`: List of Philips Hue light IDs to control
- `lantern.hueBridgeIp`: IP address of the Philips Hue bridge
- `lantern.hueUsername`: Philips Hue bridge username/API key
- `lantern.hueDefaultColor`: Default color for Hue lights when no workspace color is assigned (default: #000000)

## Known Issues

- Color changes require VS Code to reload the workspace to take full effect
- Philips Hue discovery requires the bridge to be on the same local network
- Some color combinations may have poor contrast with text elements

## Release Notes

### 0.0.1

Initial release of Lantern with:

- Unique status bar color assignment per workspace
- OKLCH color space for perceptual uniformity
- Philips Hue integration
- Global and workspace settings support
- Status bar indicator for quick access

## Contributing

Found a bug or have a feature request? Please create an issue on our GitHub repository.

## License

This extension is licensed under the MIT License.
