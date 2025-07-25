import * as vscode from 'vscode';

export interface ColorSettings {
  'statusBar.background'?: string;
}

export interface LanternConfig {
  hueIntegrationEnabled: boolean;
  hueLightIds: string[];
  hueDefaultColor: string;
  hueIntensity: number;
  workspaceColors: Record<string, ColorSettings>;
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
export function getHueIntegrationEnabled(): boolean {
  const config = getLanternConfig();
  return config.get<boolean>('hueIntegrationEnabled', false);
}

/**
 * Set Hue integration enabled status
 */
export async function setHueIntegrationEnabled(enabled: boolean): Promise<void> {
  const config = getLanternConfig();
  await config.update('hueIntegrationEnabled', enabled, vscode.ConfigurationTarget.Global);
}

/**
 * Get global toggle enabled status
 */
export function getGlobalToggleEnabled(): boolean {
  const config = getLanternConfig();
  return config.get<boolean>('globalToggleEnabled', true);
}

/**
 * Set global toggle enabled status
 */
export async function setGlobalToggleEnabled(enabled: boolean): Promise<void> {
  const config = getLanternConfig();
  await config.update('globalToggleEnabled', enabled, vscode.ConfigurationTarget.Global);
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
 * Get workspace colors from global settings
 */
export function getWorkspaceColors(): Record<string, ColorSettings> {
  const config = getLanternConfig();
  return config.get<Record<string, ColorSettings>>('workspaceColors', {});
}

/**
 * Update workspace colors in global settings
 */
export async function updateWorkspaceColors(workspaceColors: Record<string, ColorSettings>): Promise<void> {
  const config = getLanternConfig();
  await config.update('workspaceColors', workspaceColors, vscode.ConfigurationTarget.Global);
}

/**
 * Get color settings for a specific workspace path from global settings
 */
export function getWorkspaceColorSettings(workspacePath: string): ColorSettings | null {
  const workspaceColors = getWorkspaceColors();
  return workspaceColors[workspacePath] || null;
}

/**
 * Set color settings for a specific workspace path in global settings
 */
export async function setWorkspaceColorSettings(workspacePath: string, colorSettings: ColorSettings): Promise<void> {
  const workspaceColors = getWorkspaceColors();
  workspaceColors[workspacePath] = colorSettings;
  await updateWorkspaceColors(workspaceColors);
}

/**
 * Check if color settings contain any color values
 */
export function hasColorSettings(settings: ColorSettings): boolean {
  if (!settings) {
    return false;
  }

  return Boolean(settings['statusBar.background']);
}
