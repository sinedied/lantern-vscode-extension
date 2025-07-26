import * as vscode from 'vscode';
import { RgbColor, generateRandomColor, rgbToHex, isValidHexColor, hexToRgb } from './colors';
import { Hue } from './hue';
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
} from './config';

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

  getCurrentColor(): RgbColor | undefined {
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
    const currentColor = enabled ? this.getCurrentColor() : undefined;
    await this.applyColor(currentColor);
    await this.updateHueLights(currentColor);
  }

  async assignUniqueColor(): Promise<void> {
    if (!this.currentWorkspacePath) {
      vscode.window.showErrorMessage('No workspace is currently open.');
      return;
    }

    const enabled = getEnabled();
    if (!enabled) {
      await setEnabled(true);
    }

    let currentColor = this.getCurrentColor();
    const newColor = generateRandomColor(currentColor);
    const hexColor = rgbToHex(newColor);

    await setWorkspaceColor(this.currentWorkspacePath, hexColor);
    await this.applyWorkspaceColor();

    vscode.window.showInformationMessage(`Lantern: Assigned color ${hexColor} to workspace.`);
  }

  async assignColorManually(): Promise<void> {
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

    // Parse the hex color to RGB for Hue integration
    let rgbColor: RgbColor;
    try {
      rgbColor = hexToRgb(hexColor);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Invalid hex color format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return;
    }

    await setWorkspaceColor(this.currentWorkspacePath, hexColor);
    await this.applyWorkspaceColor();

    vscode.window.showInformationMessage(`Lantern: Assigned color ${hexColor} to workspace.`);
  }

  async setHueIntensity(): Promise<void> {
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
    if (!this.currentWorkspacePath) {
      vscode.window.showErrorMessage('No workspace is currently open.');
      return;
    }

    await setWorkspaceColor(this.currentWorkspacePath, undefined);
    await this.applyWorkspaceColor();

    vscode.window.showInformationMessage('Lantern: Colors reset for this workspace.');
  }

  getHueService(): Hue {
    return this.hueService;
  }

  private async applyColor(color?: RgbColor): Promise<void> {
    const currentColorCustomizations = getColorCustomizations();

    if (color) {
      const hexColor = rgbToHex(color);
      const colorCustomizations = {
        ...currentColorCustomizations,
        'statusBar.background': hexColor,
      };
      await updateColorCustomizations(colorCustomizations);
    } else {
      let hasChanges = false;
      const colorCustomizations = { ...currentColorCustomizations };
      if (colorCustomizations['statusBar.background']) {
        delete colorCustomizations['statusBar.background'];
        hasChanges = true;
      }

      if (hasChanges) {
        await updateColorCustomizations(colorCustomizations);
      }
    }
  }

  private async updateHueLights(color?: RgbColor): Promise<void> {
    if (!this.hueService.isEnabled() || !this.hueService.isConfigured()) {
      return;
    }

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
      console.error('Failed to update Hue lights:', error);
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
