import * as vscode from 'vscode';
import { RgbColor, generateRandomColorVariant, getCurrentThemeColor, rgbToHex } from './colors';
import { Hue } from './hue';
import { ColorSettings, getTargetElement, setTargetElement, getWorkspaceSpecificColorSettings, hasColorSettings, getWorkspaceColorSettings, setWorkspaceColorSettings, saveWorkspaceSpecificColorSettings, getColorCustomizations, updateColorCustomizations, getWorkspaceColors, updateWorkspaceColors, clearWorkspaceSpecificColorSettings, getHueLightIds } from './config';

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

    const targetElement = getTargetElement();

    // Hide status bar indicator if it's not the target element
    if (targetElement !== 'statusBarIndicator') {
      this.hideStatusBarIndicator();
    } else {
      // For status bar indicator, always create it (even if no color is assigned)
      this.createStatusBarIndicator();
    }

    // Check workspace settings first
    const workspaceSettings = this.getWorkspaceSettings();
    if (workspaceSettings && hasColorSettings(workspaceSettings)) {
      await this.applyColor(workspaceSettings, targetElement);
      return;
    }

    // Check global settings
    const globalSettings = this.getGlobalSettings();
    if (globalSettings && hasColorSettings(globalSettings)) {
      await this.applyColor(globalSettings, targetElement);
      return;
    }

    // If no stored colors but target is status bar indicator, show it with default styling
    if (targetElement === 'statusBarIndicator') {
      this.createStatusBarIndicator();
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

    const targetElement = getTargetElement();

    // Get current theme color for the target element
    const baseColor = getCurrentThemeColor(targetElement);

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
    const colorSettings = this.createColorSettings(targetElement, hexColor);

    // Save settings
    if (saveLocation.value === 'workspace') {
      await this.saveToWorkspaceSettings(colorSettings);
    } else {
      await this.saveToGlobalSettings(colorSettings);
    }

    // Apply the color
    await this.applyColor(colorSettings, targetElement);

    // Update Hue lights if enabled
    if (this.hueService.isEnabled() && this.hueService.isConfigured()) {
      await this.updateHueLights(newColor);
    }

    vscode.window.showInformationMessage(
      `Lantern: Assigned color ${hexColor} to ${targetElement}. Settings saved to ${saveLocation.label.toLowerCase()}.`,
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

    const targetElement = getTargetElement();

    // Hide status bar indicator if it's the target element
    if (targetElement === 'statusBarIndicator') {
      this.hideStatusBarIndicator();
    }

    // Remove from workspace settings
    const currentColorCustomizations = getColorCustomizations();

    // Create a new object instead of modifying the existing one
    const colorCustomizations = { ...currentColorCustomizations };

    const colorKeys = ['statusBar.background', 'titleBar.activeBackground', 'activityBar.background'];
    let hasChanges = false;

    for (const key of colorKeys) {
      if (colorCustomizations[key]) {
        delete colorCustomizations[key];
        hasChanges = true;
      }
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

  private createColorSettings(targetElement: string, hexColor: string): ColorSettings {
    if (targetElement === 'statusBarIndicator') {
      // For status bar indicator, we store the color in a custom property
      // but for compatibility, we'll also set the statusBar.background
      return {
        'statusBar.background': hexColor,
      };
    }

    const colorKeys: { [key: string]: keyof ColorSettings } = {
      statusBar: 'statusBar.background',
      titleBar: 'titleBar.activeBackground',
      activityBar: 'activityBar.background',
    };

    return {
      [colorKeys[targetElement]]: hexColor,
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

  private async applyColor(colorSettings: ColorSettings, targetElement: string): Promise<void> {
    if (targetElement === 'statusBarIndicator') {
      this.updateStatusBarIndicator(colorSettings);
    } else {
      const currentColorCustomizations = getColorCustomizations();

      // Create a new object instead of modifying the existing one
      const colorCustomizations = {
        ...currentColorCustomizations,
        ...colorSettings,
      };

      await updateColorCustomizations(colorCustomizations);
    }
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
    this.statusBarItem.text = '  $(lantern-icon)';
    this.statusBarItem.tooltip = 'Lantern';
    this.statusBarItem.show();
  }

  /**
   * Update the status bar indicator with the given color
   */
  private updateStatusBarIndicator(colorSettings: ColorSettings): void {
    this.createStatusBarIndicator();

    if (!this.statusBarItem) {
      return;
    }

    // Extract color from colorSettings - we'll use any available color
    const color = colorSettings['statusBar.background'] ||
                  colorSettings['titleBar.activeBackground'] ||
                  colorSettings['activityBar.background'];

    if (color) {
      // Use the custom lantern icon with color
      this.statusBarItem.text = `$(lantern-icon)`;
      this.statusBarItem.color = color;
      this.statusBarItem.tooltip = `Lantern - Workspace Color: ${color}`;
      this.statusBarItem.command = {
        command: 'lantern.statusBarIndicatorClicked',
        title: 'Lantern Status Bar Indicator'
      };
    }
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
   * Switch the target element for colorization
   */
  async switchTargetElement(): Promise<void> {
    const currentTargetElement = getTargetElement();

    const targetOptions = [
      { label: 'Status Bar Indicator', value: 'statusBarIndicator', description: 'Colored circle icon in status bar (non-intrusive)' },
      { label: 'Status Bar', value: 'statusBar', description: 'Changes status bar background color' },
      { label: 'Title Bar', value: 'titleBar', description: 'Changes title bar background color' },
      { label: 'Activity Bar', value: 'activityBar', description: 'Changes activity bar background color' },
    ];

    const selectedOption = await vscode.window.showQuickPick(
      targetOptions,
      {
        placeHolder: `Current: ${currentTargetElement}. Choose which UI element to colorize:`,
        ignoreFocusOut: true,
      }
    );

    if (!selectedOption) {
      return;
    }

    const newTargetElement = selectedOption.value as any;

    if (newTargetElement === currentTargetElement) {
      vscode.window.showInformationMessage(`Visualisation is already set to ${selectedOption.label}.`);
      return;
    }

    // Ask user if they want to reset colors before switching
    const resetChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes, reset colors first', value: 'reset' },
        { label: 'No, keep current colors', value: 'keep' },
      ],
      {
        placeHolder: 'Reset current workspace colors before switching visualisation?',
        ignoreFocusOut: true,
      }
    );

    if (!resetChoice) {
      return;
    }

    // Reset colors if requested
    if (resetChoice.value === 'reset') {
      await this.resetColors();
    }

    // Set the new target element
    await setTargetElement(newTargetElement);

    // Apply stored colors with the new target element
    await this.applyStoredColors();

    vscode.window.showInformationMessage(
      `Lantern: Visualisation switched to ${selectedOption.label}.${resetChoice.value === 'reset' ? ' Colors have been reset.' : ''}`
    );
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.hideStatusBarIndicator();
  }
}
