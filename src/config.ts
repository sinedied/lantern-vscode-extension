import * as vscode from 'vscode';

export type TargetElement = 'statusBar' | 'titleBar' | 'activityBar';
export type StorageLocation = 'global' | 'workspace';

export interface ColorSettings {
  'statusBar.background'?: string;
  'titleBar.activeBackground'?: string;
  'activityBar.background'?: string;
}

export interface LanternConfig {
  targetElement: TargetElement;
  hueIntegrationEnabled: boolean;
  hueLightIds: string[];
  hueDefaultColor: string;
  workspaceColors: Record<string, ColorSettings>;
  statusBarBackground?: string;
  titleBarActiveBackground?: string;
  activityBarBackground?: string;
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
 * Get the target element setting
 */
export function getTargetElement(): TargetElement {
  const config = getLanternConfig();
  return config.get<TargetElement>('targetElement', 'statusBar');
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
  const titleBarBg = config.get<string>('titleBarActiveBackground');
  const activityBarBg = config.get<string>('activityBarBackground');

  if (statusBarBg) {
    settings['statusBar.background'] = statusBarBg;
  }
  if (titleBarBg) {
    settings['titleBar.activeBackground'] = titleBarBg;
  }
  if (activityBarBg) {
    settings['activityBar.background'] = activityBarBg;
  }

  return settings;
}

/**
 * Save color settings to workspace-specific configuration
 */
export async function saveWorkspaceSpecificColorSettings(colorSettings: ColorSettings): Promise<void> {
  const config = getLanternConfig();

  for (const [key, value] of Object.entries(colorSettings)) {
    let configKey: string;
    switch (key) {
      case 'statusBar.background':
        configKey = 'statusBarBackground';
        break;
      case 'titleBar.activeBackground':
        configKey = 'titleBarActiveBackground';
        break;
      case 'activityBar.background':
        configKey = 'activityBarBackground';
        break;
      default:
        continue;
    }
    await config.update(configKey, value, vscode.ConfigurationTarget.Workspace);
  }
}

/**
 * Clear workspace-specific color settings
 */
export async function clearWorkspaceSpecificColorSettings(): Promise<void> {
  const config = getLanternConfig();
  const colorKeys = ['statusBarBackground', 'titleBarActiveBackground', 'activityBarBackground'];

  for (const key of colorKeys) {
    await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
  }
}

/**
 * Get current color for the target element
 */
export function getCurrentElementColor(targetElement: TargetElement): string | undefined {
  const colorCustomizations = getColorCustomizations();

  switch (targetElement) {
    case 'statusBar':
      return colorCustomizations['statusBar.background'];
    case 'titleBar':
      return colorCustomizations['titleBar.activeBackground'];
    case 'activityBar':
      return colorCustomizations['activityBar.background'];
    default:
      return undefined;
  }
}

/**
 * Check if color settings contain any color values
 */
export function hasColorSettings(settings: ColorSettings): boolean {
  if (!settings) {
    return false;
  }

  const colorKeys: (keyof ColorSettings)[] = [
    'statusBar.background',
    'titleBar.activeBackground',
    'activityBar.background',
  ];
  return colorKeys.some((key) => settings[key]);
}
