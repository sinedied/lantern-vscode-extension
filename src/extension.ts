// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Lantern } from './lantern';
import { hexToRgb } from './colors';
import { setHueIntegrationEnabled, getHueLightIds, setHueLightIds, getHueIntegrationEnabled, getColorCustomizations, getHueDefaultColor, getGlobalToggleEnabled, setGlobalToggleEnabled } from './config';

let colorService: Lantern;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "lantern" is now active!');

  // Initialize the color service
  colorService = new Lantern();

  // Apply stored colors and update Hue lights when the extension activates (async)
  initializeExtension();

  // Listen for workspace folder changes to update colors and Hue lights
  const workspaceFoldersDisposable = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
    // Workspace folders changed, reapply colors and update Hue lights
    await colorService.applyStoredColors();
    await updateHueLightsOnWindowFocus();
  });

  // Listen for window state changes to update Hue lights when window becomes active
  const windowStateDisposable = vscode.window.onDidChangeWindowState(async (windowState) => {
    if (windowState.focused) {
      // Window became active, update Hue lights if integration is enabled
      await updateHueLightsOnWindowFocus();
    }
  });

  // Listen for configuration changes to update colors and Hue lights when settings change
  const configurationDisposable = vscode.workspace.onDidChangeConfiguration(async (event) => {
    // Check if Lantern configuration changed
    if (event.affectsConfiguration('lantern') || event.affectsConfiguration('workbench.colorCustomizations')) {
      // Configuration changed, reapply colors and update Hue lights
      await colorService.applyStoredColors();
      await updateHueLightsOnWindowFocus();
    }
  });

  // Register the assign unique color command
  const assignColorDisposable = vscode.commands.registerCommand('lantern.assignUniqueColor', async () => {
    await colorService.assignUniqueColor();
  });

  // Register the set color manually command
  const setColorManuallyDisposable = vscode.commands.registerCommand('lantern.setColorManually', async () => {
    await colorService.setColorManually();
  });

  // Register the global toggle command
  const toggleGlobalDisposable = vscode.commands.registerCommand('lantern.toggleGlobal', async () => {
    await toggleGlobalFunctionality();
  });

  // Register the enable Hue integration command
  const enableHueDisposable = vscode.commands.registerCommand('lantern.enableHueIntegration', async () => {
    await enableHueIntegration();
  });

  // Register the disable Hue integration command
  const disableHueDisposable = vscode.commands.registerCommand('lantern.disableHueIntegration', async () => {
    await disableHueIntegration();
  });

  // Register the set Hue intensity command
  const setHueIntensityDisposable = vscode.commands.registerCommand('lantern.setHueIntensity', async () => {
    await colorService.setHueIntensity();
  });

  // Register the reset colors command
  const resetColorsDisposable = vscode.commands.registerCommand('lantern.resetColors', async () => {
    await colorService.resetColors();
  });

  // Register the show commands command
  const showCommandsDisposable = vscode.commands.registerCommand('lantern.showCommands', async () => {
    await showLanternCommands();
  });

  context.subscriptions.push(
    assignColorDisposable,
    setColorManuallyDisposable,
    toggleGlobalDisposable,
    enableHueDisposable,
    disableHueDisposable,
    setHueIntensityDisposable,
    resetColorsDisposable,
    showCommandsDisposable,
    workspaceFoldersDisposable,
    windowStateDisposable,
    configurationDisposable,
    colorService,
  );
}

async function initializeExtension(): Promise<void> {
  try {
    // Apply stored colors when the extension activates
    await colorService.applyStoredColors();

    // Update Hue lights on initial activation
    await updateHueLightsOnWindowFocus();
  } catch (error) {
    console.error('Failed to initialize Lantern extension:', error);
  }
}

async function showLanternCommands(): Promise<void> {
  const isEnabled = getGlobalToggleEnabled();

  const commands = [
    {
      label: isEnabled ? '$(lantern-off) Turn off Lantern' : '$(lantern-on) Turn on Lantern',
      description: isEnabled ? 'Disable all Lantern functionality' : 'Enable all Lantern functionality',
      command: 'lantern.toggleGlobal'
    },
    {
      label: '$(symbol-color) Assign unique color',
      description: 'Assign a unique color to this workspace',
      command: 'lantern.assignUniqueColor'
    },
    {
      label: '$(color-mode) Set color manually',
      description: 'Set a custom hex color (e.g., #ff0000)',
      command: 'lantern.setColorManually'
    },
    {
      label: '$(refresh) Reset colors',
      description: 'Remove all assigned colors',
      command: 'lantern.resetColors'
    },
    {
      label: '$(lightbulb) Enable Philips Hue',
      description: 'Connect to Philips Hue lights',
      command: 'lantern.enableHueIntegration'
    },
    {
      label: '$(circle-slash) Disable Philips Hue',
      description: 'Disconnect from Philips Hue lights',
      command: 'lantern.disableHueIntegration'
    },
    {
      label: '$(light-bulb) Set Hue intensity',
      description: 'Adjust brightness of Philips Hue lights (0-100%)',
      command: 'lantern.setHueIntensity'
    }
  ];

  const selectedCommand = await vscode.window.showQuickPick(commands, {
    placeHolder: 'Select a Lantern command',
    title: 'Lantern Commands'
  });

  if (selectedCommand) {
    await vscode.commands.executeCommand(selectedCommand.command);
  }
}

async function toggleGlobalFunctionality(): Promise<void> {
  const currentState = getGlobalToggleEnabled();
  const newState = !currentState;

  await setGlobalToggleEnabled(newState);

  if (newState) {
    // Enabling: apply stored colors and update Hue lights
    await colorService.applyStoredColors();

    // Update Hue lights to current workspace color if integration is enabled
    await updateHueLightsOnWindowFocus();

    vscode.window.showInformationMessage('Lantern functionality enabled.');
  } else {
    // Disabling: remove colors and turn off Hue lights, but keep status bar visible
    await colorService.removeColorsButKeepStatusBar();

    // Turn off Hue lights if integration is enabled
    if (getHueIntegrationEnabled()) {
      const hueService = colorService.getHueService();
      const lightIds = getHueLightIds();

      if (lightIds.length > 0 && hueService.isConfigured()) {
        try {
          await hueService.turnOffLights(lightIds);
        } catch (error) {
          console.error('Failed to turn off Hue lights during global toggle:', error);
        }
      }
    }

    vscode.window.showInformationMessage('Lantern functionality disabled.');
  }
}

async function enableHueIntegration(): Promise<void> {
  const hueService = colorService.getHueService();

  try {
    // Check if already configured
    if (hueService.isConfigured()) {
      const testConnection = await hueService.testConnection();
      if (testConnection) {
        // Already configured and working, just enable
        await setHueIntegrationEnabled(true);

        // Let user select lights
        await selectHueLights();
        return;
      }
    }

    vscode.window.showInformationMessage('Setting up Philips Hue integration...');

    // Discover bridges
    const bridges = await hueService.discoverBridges();
    if (bridges.length === 0) {
      vscode.window.showErrorMessage(
        'No Philips Hue bridges found on the network. Make sure your bridge is connected and on the same network.',
      );
      return;
    }

    // Select bridge if multiple found
    let selectedBridge = bridges[0];
    if (bridges.length > 1) {
      const bridgeOptions = bridges.map((bridge) => ({
        label: `Bridge at ${bridge.ip}`,
        bridge,
      }));

      const selection = await vscode.window.showQuickPick(bridgeOptions, {
        placeHolder: 'Select a Philips Hue bridge',
      });

      if (!selection) {
        return;
      }

      selectedBridge = selection.bridge;
    }

    // Show instructions for bridge button press
    const buttonPressed = await vscode.window.showInformationMessage(
      'Press the button on your Philips Hue bridge, then click "Continue" within 2 minutes.',
      'Continue',
      'Cancel',
    );

    if (buttonPressed !== 'Continue') {
      return;
    }

    // Create user
    try {
      const username = await hueService.createUser(selectedBridge.ip);
      if (!username) {
        vscode.window.showErrorMessage('Failed to connect to Hue bridge. Make sure you pressed the button.');
        return;
      }

      // Enable integration
      await setHueIntegrationEnabled(true);

      vscode.window.showInformationMessage('Philips Hue integration enabled successfully!');

      // Let user select lights
      await selectHueLights();
    } catch (error: any) {
      if (error.message?.includes('link button not pressed')) {
        vscode.window.showErrorMessage(
          'Bridge button was not pressed. Please try again and press the button on your Hue bridge.',
        );
      } else {
        vscode.window.showErrorMessage(`Failed to connect to Hue bridge: ${error.message}`);
      }
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to setup Hue integration: ${error.message}`);
  }
}

async function selectHueLights(): Promise<void> {
  const hueService = colorService.getHueService();

  try {
    const lights = await hueService.getLights();
    if (lights.length === 0) {
      vscode.window.showWarningMessage('No Hue lights found.');
      return;
    }

    // Get previously selected light IDs to pre-select them
    const previouslySelectedIds = getHueLightIds();

    const lightOptions = lights.map((light) => ({
      label: light.name,
      description: `ID: ${light.id}`,
      picked: previouslySelectedIds.includes(light.id),
      lightId: light.id,
    }));

    const placeholderText =
      previouslySelectedIds.length > 0
        ? 'Select which lights to control (previously selected lights are pre-selected)'
        : 'Select which lights to control (you can select multiple)';

    const selectedLights = await vscode.window.showQuickPick(lightOptions, {
      placeHolder: placeholderText,
      canPickMany: true,
    });

    if (!selectedLights || selectedLights.length === 0) {
      vscode.window.showInformationMessage('No lights selected. You can change this later in settings.');
      return;
    }

    const lightIds = selectedLights.map((light) => light.lightId);
    await setHueLightIds(lightIds);

    const lightNames = selectedLights.map((light) => light.label).join(', ');
    vscode.window.showInformationMessage(`Selected lights: ${lightNames}`);

    // Apply current workspace color to the selected lights
    await applyCurrentColorToHueLights();
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to get Hue lights: ${error.message}`);
  }
}

async function disableHueIntegration(): Promise<void> {
  try {
    // Get the selected lights and turn them off before disabling integration
    const lightIds = getHueLightIds();

    if (lightIds.length > 0) {
      const hueService = colorService.getHueService();

      if (hueService.isConfigured()) {
        try {
          await hueService.turnOffLights(lightIds);
          vscode.window.showInformationMessage('Turned off Hue lights and disabled integration.');
        } catch (error) {
          console.error('Failed to turn off lights during disable:', error);
          vscode.window.showWarningMessage('Disabled Hue integration but failed to turn off lights.');
        }
      } else {
        vscode.window.showInformationMessage('Philips Hue integration disabled.');
      }
    } else {
      vscode.window.showInformationMessage('Philips Hue integration disabled.');
    }

    // Disable the integration
    await setHueIntegrationEnabled(false);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to disable Hue integration: ${error.message}`);
  }
}

async function applyCurrentColorToHueLights(): Promise<void> {
  try {
    // Check if there's a current workspace color to apply
    const colorCustomizations = getColorCustomizations();

    // Get the current color for the status bar
    const currentColor = colorCustomizations['statusBar.background'];

    if (!currentColor) {
      // No current color set, nothing to apply
      return;
    }

    // Convert hex color to RGB
    const rgbColor = hexToRgb(currentColor);

    // Apply color to Hue lights
    const hueService = colorService.getHueService();
    const lightIds = getHueLightIds();

    if (lightIds.length > 0) {
      await hueService.setLightColor(lightIds, rgbColor);
      vscode.window.showInformationMessage(`Applied current workspace color ${currentColor} to Hue lights.`);
    }
  } catch (error: any) {
    console.error('Failed to apply current color to Hue lights:', error);
    vscode.window.showWarningMessage('Failed to apply current color to Hue lights.');
  }
}

async function updateHueLightsOnWindowFocus(): Promise<void> {
  try {
    // Check if global toggle is enabled
    const globalToggleEnabled = getGlobalToggleEnabled();
    if (!globalToggleEnabled) {
      return; // Global toggle is disabled
    }

    // Check if Hue integration is enabled
    const hueEnabled = getHueIntegrationEnabled();

    if (!hueEnabled) {
      return; // Hue integration is disabled
    }

    const hueService = colorService.getHueService();
    if (!hueService.isConfigured()) {
      return; // Hue not configured
    }

    // Check if there are lights configured
    const lightIds = getHueLightIds();
    if (lightIds.length === 0) {
      return; // No lights configured
    }

    // Get the current workspace color
    const colorCustomizations = getColorCustomizations();

    // Get the current color for the status bar
    let currentColor = colorCustomizations['statusBar.background'];

    // If no current workspace color, use the default color
    if (!currentColor) {
      currentColor = getHueDefaultColor();
    }

    console.log(`Updating Hue lights to color: ${currentColor}`);

    // Check if we should turn off the lights (default color is #000000)
    if (currentColor === '#000000') {
      await hueService.turnOffLights(lightIds);
      console.log('Turned off Hue lights (default color)');
    } else {
      // Convert hex color to RGB and apply to lights
      const rgbColor = hexToRgb(currentColor);
      await hueService.setLightColor(lightIds, rgbColor);
      console.log(`Applied color ${currentColor} to Hue lights`);
    }

    // Optional: Show a subtle notification (commented out to avoid spam)
    // vscode.window.showInformationMessage(`Updated Hue lights to ${currentColor === '#000000' ? 'off' : `color ${currentColor}`}`);
  } catch (error: any) {
    console.error('Failed to update Hue lights on window focus:', error);
    // Don't show error messages to user to avoid spam, just log
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
