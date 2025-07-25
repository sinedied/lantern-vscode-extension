import * as vscode from 'vscode';

export type StorageLocation = 'global' | 'workspace';

export interface ColorSettings {
  'statusBar.background'?: string;
}

export interface LanternConfig {
  hueIntegrationEnabled: boolean;
  hueLightIds: string[];
  hueDefaultColor: string;
  workspaceColors: Record<string, ColorSettings>;
  statusBarBackground?: string;
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
 * Get current color customizations from workbench
 */
export function getColorCustomizations(): any {
  const config = getWorkbenchConfig();
  return config.get<any>('colorCustomizations', {});
}

/**
 * Update workbench color customizations
 */
export async function updateColorCustomizations(
  colorCustomizations: any,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace,
): Promise<void> {
  const config = getWorkbenchConfig();
  await config.update('colorCustomizations', colorCustomizations, target);
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
 * Get workspace-specific color settings (stored directly in workspace)
 */
export function getWorkspaceSpecificColorSettings(): ColorSettings {
  const config = getLanternConfig();
  const settings: ColorSettings = {};

  const statusBarBg = config.get<string>('statusBarBackground');

  if (statusBarBg) {
    settings['statusBar.background'] = statusBarBg;
  }

  return settings;
}

/**
 * Save color settings to workspace-specific configuration
 */
export async function saveWorkspaceSpecificColorSettings(colorSettings: ColorSettings): Promise<void> {
  const config = getLanternConfig();

  for (const [key, value] of Object.entries(colorSettings)) {
    if (key === 'statusBar.background') {
      await config.update('statusBarBackground', value, vscode.ConfigurationTarget.Workspace);
    }
  }
}

/**
 * Clear workspace-specific color settings
 */
export async function clearWorkspaceSpecificColorSettings(): Promise<void> {
  const config = getLanternConfig();
  await config.update('statusBarBackground', undefined, vscode.ConfigurationTarget.Workspace);
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
