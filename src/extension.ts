import * as vscode from 'vscode';
import { Lantern } from './lantern';
import {
  setHueEnabled,
  getHueLightIds,
  setHueLightIds,
  getEnabled,
  setEnabled,
} from './config';

let lantern: Lantern;

// This method is called when extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log('Lantern extension loaded');

  lantern = new Lantern();

  // Apply current settings (async)
  lantern.applyWorkspaceColor();

  // Listen for workspace folder changes to update colors and Hue lights
  const workspaceFoldersDisposable = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
    await lantern.applyWorkspaceColor();
  });

  // Listen for window state changes to update Hue lights when window becomes active
  const windowStateDisposable = vscode.window.onDidChangeWindowState(async (windowState) => {
    if (windowState.focused) {
      await lantern.applyWorkspaceColor();
    }
  });

  // Listen for configuration changes to update colors and Hue lights when settings change
  const configurationDisposable = vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration('lantern')) {
      await lantern.applyWorkspaceColor();
    }
  });

  const assignColorDisposable = vscode.commands.registerCommand('lantern.assignUniqueColor', async () => {
    await lantern.assignUniqueColor();
  });
  const assignColorManuallyDisposable = vscode.commands.registerCommand('lantern.assignColorManually', async () => {
    await lantern.assignColorManually();
  });
  const toggleDisposable = vscode.commands.registerCommand('lantern.toggle', async () => {
    await toggleLantern();
  });
  const enableHueDisposable = vscode.commands.registerCommand('lantern.enableHue', async () => {
    await enableHue();
  });
  const disableHueDisposable = vscode.commands.registerCommand('lantern.disableHue', async () => {
    await disableHue();
  });
  const setHueIntensityDisposable = vscode.commands.registerCommand('lantern.setHueIntensity', async () => {
    await lantern.setHueIntensity();
  });
  const resetWorkspaceColorDisposable = vscode.commands.registerCommand('lantern.resetWorkspaceColor', async () => {
    await lantern.resetWorkspaceColor();
  });
  const showCommandsDisposable = vscode.commands.registerCommand('lantern.showCommands', async () => {
    await showLanternCommands();
  });

  context.subscriptions.push(
    assignColorDisposable,
    assignColorManuallyDisposable,
    toggleDisposable,
    enableHueDisposable,
    disableHueDisposable,
    setHueIntensityDisposable,
    resetWorkspaceColorDisposable,
    showCommandsDisposable,
    workspaceFoldersDisposable,
    windowStateDisposable,
    configurationDisposable,
    lantern,
  );
}

async function showLanternCommands(): Promise<void> {
  const isEnabled = getEnabled();
  const commands = [
    {
      label: isEnabled ? '$(lantern-off) Turn off Lantern' : '$(lantern-on) Turn on Lantern',
      description: isEnabled ? 'Disable all Lantern functionality' : 'Enable all Lantern functionality',
      command: 'lantern.toggle',
    },
    {
      label: '$(symbol-color) Assign unique color',
      description: 'Assign a unique color to this workspace',
      command: 'lantern.assignUniqueColor',
    },
    {
      label: '$(color-mode) Assign color manually',
      description: 'Assign a custom color (e.g., #0000ff)',
      command: 'lantern.assignColorManually',
    },
    {
      label: '$(refresh) Reset workspace color',
      description: 'Remove assigned color',
      command: 'lantern.resetWorkspaceColor',
    },
    {
      label: '$(lightbulb) Enable Philips Hue',
      description: 'Connect to Philips Hue lights',
      command: 'lantern.enableHue',
    },
    {
      label: '$(lightbulb-empty) Disable Philips Hue',
      description: 'Disconnect from Philips Hue lights',
      command: 'lantern.disableHue',
    },
    {
      label: '$(lightbulb-sparkle) Set Philips Hue intensity',
      description: 'Adjust brightness of Philips Hue lights (0-100%)',
      command: 'lantern.setHueIntensity',
    },
  ];

  const selectedCommand = await vscode.window.showQuickPick(commands, {
    placeHolder: 'Select a Lantern command',
    title: 'Lantern Commands',
  });

  if (selectedCommand) {
    await vscode.commands.executeCommand(selectedCommand.command);
  }
}

async function toggleLantern(): Promise<void> {
  const currentState = getEnabled();
  const newState = !currentState;
  await setEnabled(newState);
  await lantern.applyWorkspaceColor();
}

async function enableHue(): Promise<void> {
  console.log('Enabling Philips Hue...');
  const hueService = lantern.getHueService();

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
  const hueService = lantern.getHueService();

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

    await lantern.applyWorkspaceColor();
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to get Hue lights: ${error.message}`);
  }
}

async function disableHue(): Promise<void> {
  console.log('Disabling Philips Hue...');
  try {
    const hueService = lantern.getHueService();
    const lightIds = getHueLightIds();

    if (lightIds.length > 0 && hueService.isConfigured()) {
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

    await setHueEnabled(false);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to disable Philips Hue: ${error.message}`);
  }
}

// This method is called when extension is deactivated
export function deactivate() {}
