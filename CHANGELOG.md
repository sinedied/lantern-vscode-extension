# Change Log

All notable changes to the "Lantern" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2025-07-24

### Added
- **Initial release of Lantern VS Code Extension**
- Unique color assignment per workspace using OKLCH color space
- Support for colorizing title bar, status bar, or activity bar
- Global and workspace-specific settings storage
- Philips Hue integration for syncing workspace colors with smart lights
- Auto-discovery of Philips Hue bridges
- Support for controlling multiple Hue lights simultaneously
- Commands for:
  - Assigning unique colors to workspaces
  - Enabling/disabling Philips Hue integration
  - Resetting workspace colors
- Comprehensive test suite for color utility functions
- TypeScript implementation with ESM support

### Features
- **Smart Color Generation**: Uses OKLCH color space for perceptually uniform color variants
- **Flexible Storage**: Save settings globally (per project path) or per workspace
- **Hue Integration**: Optional Philips Hue bridge connection with light selection
- **Multiple UI Targets**: Choose between status bar, title bar, or activity bar colorization
- **Easy Setup**: Command palette integration for all functionality

### Technical Details
- Built with TypeScript and modern Node.js features
- Uses VS Code's workbench.colorCustomizations API
- Implements OKLCH to RGB color space conversion
- HTTP-based Philips Hue bridge communication
- Comprehensive error handling and user feedback

### Settings
- `lantern.targetElement`: UI element to colorize (statusBar, titleBar, activityBar)
- `lantern.hueIntegrationEnabled`: Enable/disable Philips Hue sync
- `lantern.hueLightIds`: Array of Hue light IDs to control
- `lantern.hueBridgeIp`: Hue bridge IP address (auto-discovered)
- `lantern.hueUsername`: Hue bridge API key (auto-generated)