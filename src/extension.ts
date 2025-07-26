import * as vscode from 'vscode';
import { Lantern } from './lantern';
import { hexToRgb } from './colors';
import { setHueEnabled, getHueLightIds, setHueLightIds, getHueEnabled, getColorCustomizations, getHueDefaultColor, getEnabled, setEnabled } from './config';

let colorService: Lantern;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log('Lantern extension loaded');

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
  const assignColorManuallyDisposable = vscode.commands.registerCommand('lantern.assignColorManually', async () => {
    await colorService.assignColorManually();
  });

  // Register the global toggle command
  const toggleGlobalDisposable = vscode.commands.registerCommand('lantern.toggleGlobal', async () => {
    await toggleLantern();
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
    assignColorManuallyDisposable,
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
  const isEnabled = getEnabled();

  const commands = [
    {
      label: isEnabled ? '$(lantern-off) Turn off Lantern' : '$(lantern-on) Turn on Lantern',
      description: isEnabled ? 'Disable all Lantern functionality' : 'Enable all Lantern functionality',
      command: 'lantern.toggleGlobal'
    },
    {
      label: '$(symbol-color) Assign random color',
      description: 'Assign a random color to this workspace',
      command: 'lantern.assignUniqueColor'
    },
    {
      label: '$(color-mode) Assign color manually',
      description: 'Assign a custom color (e.g., #0000ff)',
      command: 'lantern.assignColorManually'
    },
    {
      label: '$(refresh) Reset workspace color',
      description: 'Remove assigned color',
      command: 'lantern.resetColors'
    },
    {
      label: '$(lightbulb) Enable Philips Hue',
      description: 'Connect to Philips Hue lights',
      command: 'lantern.enableHueIntegration'
    },
    {
      label: '$(lightbulb-empty) Disable Philips Hue',
      description: 'Disconnect from Philips Hue lights',
      command: 'lantern.disableHueIntegration'
    },
    {
      label: '$(lightbulb-sparkle) Set Hue intensity',
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

async function toggleLantern(): Promise<void> {
  const currentState = getEnabled();
  const newState = !currentState;

  await setEnabled(newState);

  if (newState) {
    await colorService.applyStoredColors();
    await updateHueLightsOnWindowFocus();
    // vscode.window.showInformationMessage('Lantern enabled.');
  } else {
    await colorService.removeColorsButKeepStatusBar();

    if (getHueEnabled()) {
      const hueService = colorService.getHueService();
      const lightIds = getHueLightIds();

      if (lightIds.length > 0 && hueService.isConfigured()) {
        try {
          await hueService.turnOffLights(lightIds);
        } catch (error) {
          console.error('Failed to turn off Hue lights during toggle:', error);
        }
      }
    }

    // vscode.window.showInformationMessage('Lantern disabled.');
  }
}

async function enableHueIntegration(): Promise<void> {
  const hueService = colorService.getHueService();

  try {
    if (hueService.isConfigured()) {
      const testConnection = await hueService.testConnection();
      if (testConnection) {
        await setHueEnabled(true);
        await selectHueLights();
        return;
      }
    }

    vscode.window.showInformationMessage('Setting up Philips Hue...');

    const bridges = await hueService.discoverBridges();
    if (bridges.length === 0) {
      vscode.window.showErrorMessage(
        'No Philips Hue bridges found on the network. Make sure your bridge is connected and on the same network.',
      );
      return;
    }

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

    const buttonPressed = await vscode.window.showInformationMessage(
      'Press the button on your Philips Hue bridge, then click "Continue" within 2 minutes.',
      'Continue',
      'Cancel',
    );

    if (buttonPressed !== 'Continue') {
      return;
    }

    try {
      const username = await hueService.createUser(selectedBridge.ip);
      if (!username) {
        vscode.window.showErrorMessage('Failed to connect to Hue bridge. Make sure you pressed the button.');
        return;
      }

      await setHueEnabled(true);

      vscode.window.showInformationMessage('Philips Hue enabled successfully!');

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
    vscode.window.showErrorMessage(`Failed to setup Philips Hue: ${error.message}`);
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

    await applyCurrentColorToHueLights();
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to get Hue lights: ${error.message}`);
  }
}

async function disableHueIntegration(): Promise<void> {
  try {
    const lightIds = getHueLightIds();

    if (lightIds.length > 0) {
      const hueService = colorService.getHueService();

      if (hueService.isConfigured()) {
        try {
          await hueService.turnOffLights(lightIds);
          vscode.window.showInformationMessage('Philips Hue disabled.');
        } catch (error) {
          console.error('Failed to turn off lights during disable:', error);
          vscode.window.showWarningMessage('Philips Hue disabled but failed to turn off lights.');
        }
      } else {
        vscode.window.showInformationMessage('Philips Hue disabled.');
      }
    } else {
      vscode.window.showInformationMessage('Philips Hue disabled.');
    }

    await setHueEnabled(false);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to disable Philips Hue: ${error.message}`);
  }
}

async function applyCurrentColorToHueLights(): Promise<void> {
  try {
    // TODO: fix, get lantern color not from status bar
    const colorCustomizations = getColorCustomizations();
    const currentColor = colorCustomizations['statusBar.background'];
    if (!currentColor) {
      return;
    }

    const rgbColor = hexToRgb(currentColor);
    const hueService = colorService.getHueService();
    const lightIds = getHueLightIds();

    if (lightIds.length > 0) {
      await hueService.setLightColor(lightIds, rgbColor);
    }
  } catch (error: any) {
    console.error('Failed to apply current color to Hue lights:', error);
    vscode.window.showWarningMessage('Failed to apply current color to Hue lights.');
  }
}

async function updateHueLightsOnWindowFocus(): Promise<void> {
  try {
    const enabled = getEnabled();
    const hueEnabled = getHueEnabled();
    const hueService = colorService.getHueService();
    const lightIds = getHueLightIds();

    if (!enabled || !hueEnabled || !hueService.isConfigured() || lightIds.length === 0) {
      return;
    }

    // TOOD: factorize + use lantern color
    const colorCustomizations = getColorCustomizations();
    let currentColor = colorCustomizations['statusBar.background'];

    // If no current workspace color, use the default color
    if (!currentColor) {
      currentColor = getHueDefaultColor();
    }

    console.log(`Updating Hue lights to color: ${currentColor}`);

    // Check if we should turn off the lights (color #000000)
    if (currentColor === '#000000') {
      await hueService.turnOffLights(lightIds);
      console.log('Turned off Hue lights');
    } else {
      const rgbColor = hexToRgb(currentColor);
      await hueService.setLightColor(lightIds, rgbColor);
      console.log(`Applied color ${currentColor} to Hue lights`);
    }
  } catch (error: any) {
    console.error('Failed to update Hue lights on window focus:', error);
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
