# Testing Lantern Extension

This document provides instructions for testing the Lantern VS Code extension.

## Prerequisites

1. VS Code version 1.102.0 or higher
2. Node.js installed for development

## Running the Extension

### Development Mode

1. Open this project in VS Code
2. Press `F5` or go to `Run and Debug` and select `Run Extension`
3. This will open a new VS Code window with the extension loaded

### Testing Commands

In the Extension Development Host window:

#### 1. Test Basic Color Assignment

1. Open a folder/workspace in the Extension Development Host
2. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Type "Lantern: Assign unique color"
4. Choose where to save settings (global or workspace)
5. Notice the status bar (or selected UI element) color change

#### 2. Test Different UI Elements

1. Open VS Code settings (`Cmd+,` / `Ctrl+,`)
2. Search for "lantern.targetElement"
3. Change between "statusBar", "titleBar", "activityBar"
4. Run "Lantern: Assign unique color" again
5. Notice the different UI element gets colored

#### 3. Test Color Reset

1. Run "Lantern: Reset colors" from Command Palette
2. Notice the custom colors are removed

#### 4. Test Philips Hue Integration (Optional)

**Note**: Requires actual Philips Hue bridge and lights

1. Ensure your Hue bridge is on the same network
2. Run "Lantern: Enable Philips Hue integration"
3. Follow the prompts to connect to your bridge
4. Press the bridge button when prompted
5. Select lights to control
6. Assign colors and watch your lights change

## Testing Settings Storage

### Global Settings

1. Assign a color with "Global settings" option
2. Check your VS Code user settings for the `lantern` configuration
3. Open a different workspace and see if colors persist

### Workspace Settings

1. Assign a color with "Workspace settings" option
2. Check `.vscode/settings.json` in your workspace for `lantern` configuration
3. Share the workspace with someone else - they should see the same colors

## Development Testing

### Running Unit Tests

```bash
npm test
```

This runs the test suite including:
- Color utility function tests
- Extension command registration tests

### Building the Extension

```bash
npm run compile
```

### Watching for Changes

```bash
npm run watch
```

## Expected Behavior

1. **Color Assignment**: Each workspace should get a unique, perceptually distinct color
2. **Persistence**: Colors should persist between VS Code sessions
3. **No Conflicts**: Multiple workspaces should have different colors
4. **Hue Sync**: If enabled, Hue lights should match workspace colors
5. **Clean Reset**: Reset should remove all custom colors

## Troubleshooting

### Common Issues

1. **Colors not applying**: Try reloading the VS Code window
2. **Hue connection fails**: Check network connectivity and bridge accessibility
3. **Settings not persisting**: Verify workspace folder is properly opened

### Debug Information

Check the VS Code Developer Console (`Help > Toggle Developer Tools`) for any error messages from the Lantern extension.

## Package and Install

To create a VSIX package for distribution:

```bash
npm install -g vsce
vsce package
```

This creates a `.vsix` file that can be installed via:
- VS Code Extensions view > ... > Install from VSIX
- Command line: `code --install-extension lantern-0.0.1.vsix`
