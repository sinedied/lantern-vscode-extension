import * as vscode from 'vscode';
import { RgbColor, generateRandomColor, rgbToHex, isValidHexColor, hexToRgb, getContrastingTextColor } from './colors';
import { Hue } from './hue';
import { suggestColor } from './ai';
import {
  getColorCustomizations,
  updateColorCustomizations,
  getWorkspaceColor,
  setWorkspaceColor,
  getHueLightIds,
  getEnabled,
  setEnabled,
  getHueIntensity,
  setHueIntensity,
  getHueDefaultColor,
  setHueEnabled,
  setHueLightIds,
  getOverrideDebuggingColors,
} from './config';
import { logger } from './logger';

export class Lantern {
  private hueService: Hue;
  private currentWorkspacePath: string | undefined;
  private statusBarItem: vscode.StatusBarItem | undefined;

  constructor() {
    this.hueService = new Hue();
    this.updateCurrentWorkspacePath();

    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      this.updateCurrentWorkspacePath();
      await this.applyWorkspaceColor();
    });
  }

  dispose(): void {
    this.hideStatusBarIndicator();
  }

  getHueService(): Hue {
    return this.hueService;
  }

  getCurrentWorkspacePath(): string | undefined {
    return this.currentWorkspacePath;
  }

  getCurrentWorkspaceColor(): RgbColor | undefined {
    if (!this.currentWorkspacePath) {
      return undefined;
    }

    let rgbColor: RgbColor | undefined;
    const color = getWorkspaceColor(this.currentWorkspacePath);

    if (color && isValidHexColor(color)) {
      try {
        rgbColor = hexToRgb(color);
      } catch {
        // Ignore invalid color
      }
    }
    return rgbColor;
  }

  async applyWorkspaceColor(): Promise<void> {
    this.updateStatusBar();

    if (!this.currentWorkspacePath) {
      // Turn off lights if no workspace is open
      await this.updateHueLights();
      return;
    }

    const enabled = getEnabled();
    const currentColor = enabled ? this.getCurrentWorkspaceColor() : undefined;
    await this.applyColor(currentColor);
    await this.updateHueLights(currentColor);
  }

  async toggleLantern(): Promise<void> {
    const currentState = getEnabled();
    const newState = !currentState;
    await setEnabled(newState);
    await this.applyWorkspaceColor();
  }

  async assignUniqueColor(): Promise<void> {
    logger.log(`Assigning unique color to workspace: ${this.currentWorkspacePath}`);
    if (!this.currentWorkspacePath) {
      vscode.window.showErrorMessage('No workspace is currently open.');
      return;
    }

    const enabled = getEnabled();
    if (!enabled) {
      await setEnabled(true);
    }

    let currentColor = this.getCurrentWorkspaceColor();
    const newColor = generateRandomColor(currentColor);
    const hexColor = rgbToHex(newColor);

    await setWorkspaceColor(this.currentWorkspacePath, hexColor);
    // Changing the configuration triggers the update

    vscode.window.showInformationMessage(`Lantern: Assigned color ${hexColor} to workspace.`);
  }

  async assignColorManually(): Promise<void> {
    logger.log(`Assigning color manually for workspace: ${this.currentWorkspacePath}`);
    if (!this.currentWorkspacePath) {
      vscode.window.showErrorMessage('No workspace is currently open.');
      return;
    }

    const enabled = getEnabled();
    if (!enabled) {
      await setEnabled(true);
    }

    const colorInput = await vscode.window.showInputBox({
      placeHolder: 'Enter a hex color (e.g., #ff0000, #f00, #ff0000ff)',
      prompt: 'Enter a valid hex color',
      validateInput: (value: string) => {
        if (!value || !value.trim()) {
          return 'Please enter a color value';
        }

        if (!isValidHexColor(value.trim())) {
          return 'Please enter a valid hex color format (#f00, #ff0000, or #ff0000ff)';
        }

        return undefined;
      },
    });

    if (!colorInput || !colorInput.trim()) {
      return;
    }

    const hexColor = colorInput.trim();
    await setWorkspaceColor(this.currentWorkspacePath, hexColor);
    // Changing the configuration triggers the update

    vscode.window.showInformationMessage(`Lantern: Assigned color ${hexColor} to workspace.`);
  }

  async suggestColorWithAI(): Promise<void> {
    if (!this.currentWorkspacePath) {
      vscode.window.showErrorMessage('No workspace is currently open.');
      return;
    }

    const inspiration = await vscode.window.showInputBox({
      placeHolder: 'Enter inspiration or specific needs (optional)',
      prompt: "Describe what kind of color you're looking for or leave empty for a general suggestion",
      title: 'AI Color Suggestion',
    });

    // User cancelled
    if (inspiration === undefined) {
      return;
    }

    const previousColor = this.getCurrentWorkspaceColor();
    const hexPreviousColor = previousColor ? rgbToHex(previousColor) : undefined;

    let suggestion: Awaited<ReturnType<typeof suggestColor>>;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Suggesting color with AI...',
        cancellable: false,
      },
      async () => {
        suggestion = await suggestColor(inspiration || undefined, hexPreviousColor);
      },
    );

    if (!suggestion) {
      return;
    }

    const enabled = getEnabled();
    if (!enabled) {
      await setEnabled(true);
    }

    await setWorkspaceColor(this.currentWorkspacePath, suggestion.color);

    const action = await vscode.window.showInformationMessage(
      `AI suggested color applied: ${suggestion.color}\n${suggestion.justification}`,
      'Keep',
      'Revert',
    );

    if (action === 'Revert') {
      await setWorkspaceColor(this.currentWorkspacePath, hexPreviousColor);
      vscode.window.showInformationMessage('Reverted to previous color.');
    }
  }

  async enableHue(): Promise<void> {
    logger.log('Enabling Philips Hue...');
    const hueService = this.getHueService();

    try {
      if (hueService.isConfigured()) {
        const testConnection = await hueService.testConnection();
        if (testConnection) {
          await setHueEnabled(true);
          await this.selectHueLights();
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

        await this.selectHueLights();
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

  async selectHueLights(): Promise<void> {
    const hueService = this.getHueService();

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

      await this.applyWorkspaceColor();
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to get Hue lights: ${error.message}`);
    }
  }

  async disableHue(): Promise<void> {
    logger.log('Disabling Philips Hue...');
    try {
      const hueService = this.getHueService();
      const lightIds = getHueLightIds();

      if (lightIds.length > 0 && hueService.isConfigured()) {
        try {
          await hueService.turnOffLights(lightIds);
          vscode.window.showInformationMessage('Philips Hue disabled.');
        } catch (error) {
          logger.error('Failed to turn off lights during disable', error);
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

  async setHueIntensity(): Promise<void> {
    logger.log('Setting Philips Hue intensity...');
    if (!this.hueService.isEnabled()) {
      vscode.window.showErrorMessage('Philips Hue is not enabled. Use "Lantern: Enable Philips Hue" first.');
      return;
    }

    if (!this.hueService.isConfigured()) {
      vscode.window.showErrorMessage('Philips Hue bridge is not configured. Please configure your Hue bridge first.');
      return;
    }

    const currentIntensity = getHueIntensity();
    const intensityInput = await vscode.window.showInputBox({
      placeHolder: 'Enter intensity (0-100)',
      prompt: 'Set the brightness/intensity of your Philips Hue lights (0 = off, 100 = maximum brightness)',
      value: currentIntensity.toString(),
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num)) {
          return 'Please enter a valid number';
        }
        if (num < 0 || num > 100) {
          return 'Intensity must be between 0 and 100';
        }
        return undefined;
      },
    });

    if (intensityInput === undefined) {
      return;
    }

    const intensity = parseInt(intensityInput, 10);

    await setHueIntensity(intensity);
    await this.applyWorkspaceColor();
  }

  async resetWorkspaceColor(): Promise<void> {
    logger.log(`Resetting workspace color: ${this.currentWorkspacePath}`);
    if (!this.currentWorkspacePath) {
      vscode.window.showErrorMessage('No workspace is currently open.');
      return;
    }

    await setWorkspaceColor(this.currentWorkspacePath, undefined);
    await this.applyWorkspaceColor();

    vscode.window.showInformationMessage('Lantern: Colors reset for this workspace.');
  }

  private async applyColor(color?: RgbColor): Promise<void> {
    const currentColorCustomizations = getColorCustomizations();
    const overrideDebuggingColors = getOverrideDebuggingColors();

    if (color) {
      const hexColor = rgbToHex(color);
      const textColor = getContrastingTextColor(color);
      const colorCustomizations = {
        ...currentColorCustomizations,
        'statusBar.background': hexColor,
        'statusBar.foreground': textColor,
      };

      if (overrideDebuggingColors) {
        colorCustomizations['statusBar.debuggingBackground'] = hexColor;
        colorCustomizations['statusBar.debuggingForeground'] = textColor;
      }

      await updateColorCustomizations(colorCustomizations);
    } else {
      let hasChanges = false;
      const colorCustomizations = { ...currentColorCustomizations };
      if (colorCustomizations['statusBar.background']) {
        delete colorCustomizations['statusBar.background'];
        hasChanges = true;
      }
      if (colorCustomizations['statusBar.foreground']) {
        delete colorCustomizations['statusBar.foreground'];
        hasChanges = true;
      }

      if (overrideDebuggingColors) {
        if (colorCustomizations['statusBar.debuggingBackground']) {
          delete colorCustomizations['statusBar.debuggingBackground'];
          hasChanges = true;
        }
        if (colorCustomizations['statusBar.debuggingForeground']) {
          delete colorCustomizations['statusBar.debuggingForeground'];
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await updateColorCustomizations(colorCustomizations);
      }
    }
  }

  private async updateHueLights(color?: RgbColor): Promise<void> {
    // Philips Hue lights must only be updated for the active window
    if (!vscode.window.state.focused) {
      return;
    }

    if (!this.hueService.isEnabled() || !this.hueService.isConfigured()) {
      return;
    }

    logger.log('Updating Philips Hue lights...');
    try {
      const lightIds = getHueLightIds();
      if (lightIds.length <= 0) {
        return;
      }

      const hueColor = color ?? hexToRgb(getHueDefaultColor());
      const isBlack = !color || (color.r === 0 && color.g === 0 && color.b === 0);

      if (hueColor && !isBlack) {
        await this.hueService.setLightColor(lightIds, hueColor);
      } else {
        await this.hueService.turnOffLights(lightIds);
      }
    } catch (error) {
      logger.error('Failed to update Hue lights', error);
    }
  }

  private updateStatusBar(): void {
    if (!this.statusBarItem) {
      this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10000);
      this.statusBarItem.tooltip = 'Lantern - Click to show commands';
      this.statusBarItem.command = {
        command: 'lantern.showCommands',
        title: 'Lantern',
      };
      this.statusBarItem.show();
    }

    const enabled = getEnabled();
    this.statusBarItem.text = enabled ? '$(lantern-on)' : '$(lantern-off)';
  }

  private hideStatusBarIndicator(): void {
    if (this.statusBarItem) {
      this.statusBarItem.hide();
      this.statusBarItem.dispose();
      this.statusBarItem = undefined;
    }
  }

  private updateCurrentWorkspacePath(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    this.currentWorkspacePath =
      workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;
  }
}
