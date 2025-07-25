import * as vscode from 'vscode';
import { RgbColor, hexToRgb } from './colors';

export interface LanternConfig {
  hueEnabled: boolean;
  hueLightIds: string[];
  hueDefaultColor: string;
  hueIntensity: number;
  workspaceColor: Record<string, string>;
}

const LANTERN_CONFIG_KEY = 'lantern';
const WORKBENCH_CONFIG_KEY = 'workbench';

/**
 * Get the Lantern configuration
 */
export function getLanternConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(LANTERN_CONFIG_KEY);
}

/**
 * Get the Workbench configuration
 */
export function getWorkbenchConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(WORKBENCH_CONFIG_KEY);
}

/**
 * Get Hue integration enabled status
 */
export function getHueEnabled(): boolean {
  const config = getLanternConfig();
  return config.get<boolean>('hueEnabled', false);
}

/**
 * Set Hue integration enabled status
 */
export async function setHueEnabled(enabled: boolean): Promise<void> {
  const config = getLanternConfig();
  await config.update('hueEnabled', enabled, vscode.ConfigurationTarget.Global);
}

/**
 * Get global toggle enabled status
 */
export function getEnabled(): boolean {
  const config = getLanternConfig();
  return config.get<boolean>('enabled', true);
}

/**
 * Set global toggle enabled status
 */
export async function setEnabled(enabled: boolean): Promise<void> {
  const config = getLanternConfig();
  await config.update('enabled', enabled, vscode.ConfigurationTarget.Global);
}

/**
 * Get configured Hue light IDs
 */
export function getHueLightIds(): string[] {
  const config = getLanternConfig();
  return config.get<string[]>('hueLightIds', []);
}

/**
 * Set Hue light IDs
 */
export async function setHueLightIds(lightIds: string[]): Promise<void> {
  const config = getLanternConfig();
  await config.update('hueLightIds', lightIds, vscode.ConfigurationTarget.Global);
}

/**
 * Get Hue default color
 */
export function getHueDefaultColor(): string {
  const config = getLanternConfig();
  return config.get<string>('hueDefaultColor', '#000000');
}

/**
 * Get Hue light intensity (0-100)
 */
export function getHueIntensity(): number {
  const config = getLanternConfig();
  return config.get<number>('hueIntensity', 100);
}

/**
 * Set Hue light intensity (0-100)
 */
export async function setHueIntensity(intensity: number): Promise<void> {
  const config = getLanternConfig();
  // Clamp intensity between 0 and 100
  const clampedIntensity = Math.max(0, Math.min(100, intensity));
  await config.update('hueIntensity', clampedIntensity, vscode.ConfigurationTarget.Global);
}

/**
 * Get current color customizations from workbench
 */
export function getColorCustomizations(): any {
  const config = getWorkbenchConfig();
  return config.get<any>('colorCustomizations', {});
}

/**
 * Update workbench color customizations
 */
export async function updateColorCustomizations(colorCustomizations: any): Promise<void> {
  const config = getWorkbenchConfig();
  await config.update('colorCustomizations', colorCustomizations, vscode.ConfigurationTarget.Workspace);
}

/**
 * Get workspace colors in global settings
 */
export function getWorkspaceColorMap(): Record<string, string> {
  const config = getLanternConfig();
  return config.get<Record<string, string>>('workspaceColor', {});
}

/**
 * Update workspace color map in global settings
 */
export async function updateWorkspaceColorMap(workspaceColorMap: Record<string, string>): Promise<void> {
  const config = getLanternConfig();
  await config.update('workspaceColor', workspaceColorMap, vscode.ConfigurationTarget.Global);
}

/**
 * Get workspace-specific color setting (if user manually set it in .vscode/settings.json)
 */
export function getWorkspaceSpecificColor(): string | null {
  const config = getLanternConfig();
  const workspaceColor = config.get<string>('color');
  return workspaceColor || null;
}

/**
 * Set workspace-specific color setting (in .vscode/settings.json)
 */
export async function setWorkspaceSpecificColor(color: string | null): Promise<void> {
  const config = getLanternConfig();
  await config.update('color', color, vscode.ConfigurationTarget.Workspace);
}

/**
 * Get color for a workspace, checking both workspace-specific and global settings
 * Priority: workspace-specific color > global workspaceColor
 */
export function getWorkspaceColor(workspacePath: string): string | null {
  // First priority: workspace-specific color setting
  const workspaceSpecificColor = getWorkspaceSpecificColor();
  if (workspaceSpecificColor) {
    return workspaceSpecificColor;
  }

  // Second priority: new global workspaceColor format
  const workspaceColorMap = getWorkspaceColorMap();
  if (workspaceColorMap[workspacePath]) {
    return workspaceColorMap[workspacePath];
  }

  return null;
}

/**
 * Set color for a workspace, using workspace-specific setting if it exists, otherwise global
 */
export async function setWorkspaceColor(workspacePath: string, color: string | null): Promise<void> {
  // Check if workspace has a workspace-specific color setting
  const hasWorkspaceSpecificSetting = getWorkspaceSpecificColor() !== null;

  if (hasWorkspaceSpecificSetting) {
    // Update or remove workspace-specific setting
    await setWorkspaceSpecificColor(color);
  } else {
    // Update or remove from global workspaceColor map
    const workspaceColorMap = getWorkspaceColorMap();
    if (color === null) {
      delete workspaceColorMap[workspacePath];
    } else {
      workspaceColorMap[workspacePath] = color;
    }
    await updateWorkspaceColorMap(workspaceColorMap);
  }
}

/**
 * Gets the current color of the status bar
 */
export function getCurrentThemeColor(_element?: string): RgbColor {
  // Default color based on VS Code's default dark theme
  const defaultColor: RgbColor = { r: 0, g: 122, b: 204 }; // VS Code blue

  // Try to get the current theme color from workbench.colorCustomizations
  const colorCustomizations = getColorCustomizations();

  if (colorCustomizations['statusBar.background']) {
    try {
      return hexToRgb(colorCustomizations['statusBar.background']);
    } catch {
      // Fall back to default if parsing fails
    }
  }

  return defaultColor;
}
