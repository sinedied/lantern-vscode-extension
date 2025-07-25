import * as vscode from 'vscode';
import { RgbColor, generateRandomColorVariant, getCurrentThemeColor, rgbToHex } from './colors';
import { Hue } from './hue';
import { ColorSettings, getWorkspaceSpecificColorSettings, hasColorSettings, getWorkspaceColorSettings, setWorkspaceColorSettings, saveWorkspaceSpecificColorSettings, getColorCustomizations, updateColorCustomizations, getWorkspaceColors, updateWorkspaceColors, clearWorkspaceSpecificColorSettings, getHueLightIds } from './config';

export class Lantern {
  private hueService: Hue;
  private currentWorkspacePath: string | null = null;
  private statusBarItem: vscode.StatusBarItem | null = null;

  constructor() {
    this.hueService = new Hue();
    this.updateCurrentWorkspacePath();

    // Listen for workspace changes
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.updateCurrentWorkspacePath();
      this.applyStoredColors();
    });
  }

  private updateCurrentWorkspacePath(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    this.currentWorkspacePath = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : null;
  }

  /**
   * Apply stored colors for the current workspace
   */
  async applyStoredColors(): Promise<void> {
    if (!this.currentWorkspacePath) {
      return;
    }

    // Always show the status bar indicator
    this.createStatusBarIndicator();

    // Check workspace settings first
    const workspaceSettings = this.getWorkspaceSettings();
    if (workspaceSettings && hasColorSettings(workspaceSettings)) {
      await this.applyColor(workspaceSettings);
      return;
    }

    // Check global settings
    const globalSettings = this.getGlobalSettings();
    if (globalSettings && hasColorSettings(globalSettings)) {
      await this.applyColor(globalSettings);
      return;
    }
  }

  /**
   * Assign a unique color to the current workspace
   */
  async assignUniqueColor(): Promise<void> {
    if (!this.currentWorkspacePath) {
      vscode.window.showErrorMessage('No workspace is currently open.');
      return;
    }

    // Get current theme color for the status bar
    const baseColor = getCurrentThemeColor('statusBar');

    // Generate a random color variant
    const newColor = generateRandomColorVariant(baseColor);
    const hexColor = rgbToHex(newColor);

    // Ask user where to save the settings
    const saveLocation = await vscode.window.showQuickPick(
      [
        { label: 'Global settings (default)', value: 'global' },
        { label: 'Workspace settings', value: 'workspace' },
      ],
      {
        placeHolder: 'Where would you like to save the color settings?',
      },
    );

    if (!saveLocation) {
      return;
    }

    // Create color settings
    const colorSettings = this.createColorSettings(hexColor);

    // Save settings
    if (saveLocation.value === 'workspace') {
      await this.saveToWorkspaceSettings(colorSettings);
    } else {
      await this.saveToGlobalSettings(colorSettings);
    }

    // Apply the color
    await this.applyColor(colorSettings);

    // Update Hue lights if enabled
    if (this.hueService.isEnabled() && this.hueService.isConfigured()) {
      await this.updateHueLights(newColor);
    }

    vscode.window.showInformationMessage(
      `Lantern: Assigned color ${hexColor} to status bar. Settings saved to ${saveLocation.label.toLowerCase()}.`,
    );
  }

  /**
   * Reset colors for the current workspace
   */
  async resetColors(): Promise<void> {
    if (!this.currentWorkspacePath) {
      vscode.window.showErrorMessage('No workspace is currently open.');
      return;
    }

    // Remove from workspace settings
    const currentColorCustomizations = getColorCustomizations();

    // Create a new object instead of modifying the existing one
    const colorCustomizations = { ...currentColorCustomizations };

    let hasChanges = false;

    if (colorCustomizations['statusBar.background']) {
      delete colorCustomizations['statusBar.background'];
      hasChanges = true;
    }

    if (hasChanges) {
      await updateColorCustomizations(colorCustomizations);
    }

    // Remove from global settings
    const currentGlobalSettings = getWorkspaceColors();

    if (currentGlobalSettings[this.currentWorkspacePath]) {
      // Create a new object instead of modifying the existing one
      const globalSettings = { ...currentGlobalSettings };
      delete globalSettings[this.currentWorkspacePath];
      await updateWorkspaceColors(globalSettings);
    }

    // Remove workspace-specific settings
    await clearWorkspaceSpecificColorSettings();

    vscode.window.showInformationMessage('Lantern: Colors reset for this workspace.');
  }

  private createColorSettings(hexColor: string): ColorSettings {
    return {
      'statusBar.background': hexColor,
    };
  }

  private getWorkspaceSettings(): ColorSettings | null {
    return getWorkspaceSpecificColorSettings();
  }

  private getGlobalSettings(): ColorSettings | null {
    if (!this.currentWorkspacePath) {
      return null;
    }

    return getWorkspaceColorSettings(this.currentWorkspacePath);
  }

  private async saveToWorkspaceSettings(colorSettings: ColorSettings): Promise<void> {
    await saveWorkspaceSpecificColorSettings(colorSettings);
  }

  private async saveToGlobalSettings(colorSettings: ColorSettings): Promise<void> {
    if (!this.currentWorkspacePath) {
      throw new Error('No workspace path available');
    }

    await setWorkspaceColorSettings(this.currentWorkspacePath, colorSettings);
  }

  private async applyColor(colorSettings: ColorSettings): Promise<void> {
    const currentColorCustomizations = getColorCustomizations();

    // Create a new object instead of modifying the existing one
    const colorCustomizations = {
      ...currentColorCustomizations,
      ...colorSettings,
    };

    await updateColorCustomizations(colorCustomizations);
  }

  private async updateHueLights(color: RgbColor): Promise<void> {
    if (!this.hueService.isEnabled() || !this.hueService.isConfigured()) {
      return;
    }

    try {
      const lightIds = getHueLightIds();
      if (lightIds.length > 0) {
        await this.hueService.setLightColor(lightIds, color);
      }
    } catch (error) {
      console.error('Failed to update Hue lights:', error);
      // Don't show error to user as this is a background operation
    }
  }

  /**
   * Get the Hue service instance
   */
  getHueService(): Hue {
    return this.hueService;
  }

  /**
   * Create and configure the status bar indicator
   */
  private createStatusBarIndicator(): void {
    if (this.statusBarItem) {
      return;
    }

    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10000);
    this.statusBarItem.text = '$(lantern-icon)';
    this.statusBarItem.tooltip = 'Lantern - Click to show commands';
    this.statusBarItem.command = {
      command: 'lantern.statusBarIndicatorClicked',
      title: 'Lantern Status Bar Indicator'
    };
    this.statusBarItem.show();
  }

  /**
   * Hide and dispose the status bar indicator
   */
  private hideStatusBarIndicator(): void {
    if (this.statusBarItem) {
      this.statusBarItem.hide();
      this.statusBarItem.dispose();
      this.statusBarItem = null;
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.hideStatusBarIndicator();
  }
}
