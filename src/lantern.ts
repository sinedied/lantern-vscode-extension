import * as vscode from 'vscode';
import { RgbColor, generateRandomColorVariant, getCurrentThemeColor, rgbToHex } from './colors';
import { Hue } from './hue';
import { ColorSettings, hasColorSettings, getWorkspaceColorSettings, setWorkspaceColorSettings, getColorCustomizations, updateColorCustomizations, getWorkspaceColors, updateWorkspaceColors, getHueLightIds, getGlobalToggleEnabled } from './config';

export class Lantern {
  private hueService: Hue;
  private currentWorkspacePath: string | null = null;
  private statusBarItem: vscode.StatusBarItem | null = null;

  constructor() {
    this.hueService = new Hue();
    this.updateCurrentWorkspacePath();

    // Listen for workspace changes
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      this.updateCurrentWorkspacePath();
      await this.applyStoredColors();
      // Note: Hue lights will be updated via the extension.ts workspace listener
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

    // Always show the status bar indicator (even when globally disabled for quick toggle access)
    this.createStatusBarIndicator();

    // Check if global toggle is enabled
    const globalToggleEnabled = getGlobalToggleEnabled();

    if (!globalToggleEnabled) {
      // If globally disabled, don't apply colors but keep status bar for quick access
      return;
    }

    // Check global settings for this workspace
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

    // Check if global toggle is enabled
    const globalToggleEnabled = getGlobalToggleEnabled();

    if (!globalToggleEnabled) {
      vscode.window.showErrorMessage('Lantern is currently disabled. Use "Lantern: Toggle on/off" to enable it first.');
      return;
    }

    // Get current theme color for the status bar
    const baseColor = getCurrentThemeColor('statusBar');

    // Generate a random color variant
    const newColor = generateRandomColorVariant(baseColor);
    const hexColor = rgbToHex(newColor);

    // Create color settings
    const colorSettings = this.createColorSettings(hexColor);

    // Save settings to global configuration
    await this.saveToGlobalSettings(colorSettings);

    // Apply the color
    await this.applyColor(colorSettings);

    // Update Hue lights if enabled
    if (this.hueService.isEnabled() && this.hueService.isConfigured()) {
      await this.updateHueLights(newColor);
    }

    vscode.window.showInformationMessage(
      `Lantern: Assigned color ${hexColor} to status bar. Settings saved to global configuration.`,
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

    // Remove from workbench color customizations
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

    // Reapply any remaining stored colors after reset
    await this.applyStoredColors();

    vscode.window.showInformationMessage('Lantern: Colors reset for this workspace.');
  }

  /**
   * Temporarily remove colors from the UI without deleting stored settings
   */
  async removeColors(): Promise<void> {
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

    // Hide the status bar indicator when disabled
    this.hideStatusBarIndicator();
  }

  /**
   * Temporarily remove colors from the UI but keep the status bar indicator for quick toggle access
   */
  async removeColorsButKeepStatusBar(): Promise<void> {
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

    // Keep the status bar indicator visible for quick toggle access and update icon
    this.createStatusBarIndicator();
  }

  private createColorSettings(hexColor: string): ColorSettings {
    return {
      'statusBar.background': hexColor,
    };
  }

  private getGlobalSettings(): ColorSettings | null {
    if (!this.currentWorkspacePath) {
      return null;
    }

    return getWorkspaceColorSettings(this.currentWorkspacePath);
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

    // Update status bar icon to reflect that Lantern is enabled
    this.updateStatusBarIcon();
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
      this.updateStatusBarIcon();
      return;
    }

    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10000);
    this.updateStatusBarIcon();
    this.statusBarItem.tooltip = 'Lantern - Click to show commands';
    this.statusBarItem.command = {
      command: 'lantern.statusBarIndicatorClicked',
      title: 'Lantern Status Bar Indicator'
    };
    this.statusBarItem.show();
  }

  /**
   * Update the status bar icon based on the global toggle state
   */
  private updateStatusBarIcon(): void {
    if (!this.statusBarItem) {
      return;
    }

    const globalToggleEnabled = getGlobalToggleEnabled();
    this.statusBarItem.text = globalToggleEnabled ? '$(lantern-on)' : '$(lantern-off)';
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
