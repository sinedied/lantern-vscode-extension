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

export function getLanternConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(LANTERN_CONFIG_KEY);
}

export function getWorkbenchConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(WORKBENCH_CONFIG_KEY);
}

export function getHueEnabled(): boolean {
  const config = getLanternConfig();
  return config.get<boolean>('hueEnabled', false);
}

export async function setHueEnabled(enabled: boolean): Promise<void> {
  const config = getLanternConfig();
  await config.update('hueEnabled', enabled, vscode.ConfigurationTarget.Global);
}

export function getEnabled(): boolean {
  const config = getLanternConfig();
  return config.get<boolean>('enabled', true);
}

export async function setEnabled(enabled: boolean): Promise<void> {
  const config = getLanternConfig();
  await config.update('enabled', enabled, vscode.ConfigurationTarget.Global);
}

export function getHueLightIds(): string[] {
  const config = getLanternConfig();
  return config.get<string[]>('hueLightIds', []);
}

export async function setHueLightIds(lightIds: string[]): Promise<void> {
  const config = getLanternConfig();
  await config.update('hueLightIds', lightIds, vscode.ConfigurationTarget.Global);
}

export function getHueDefaultColor(): string {
  const config = getLanternConfig();
  return config.get<string>('hueDefaultColor', '#000000');
}

export function getHueIntensity(): number {
  const config = getLanternConfig();
  return config.get<number>('hueIntensity', 100);
}

export async function setHueIntensity(intensity: number): Promise<void> {
  const config = getLanternConfig();
  // Clamp intensity between 0 and 100
  const clampedIntensity = Math.max(0, Math.min(100, intensity));
  await config.update('hueIntensity', clampedIntensity, vscode.ConfigurationTarget.Global);
}

export function getColorCustomizations(): any {
  const config = getWorkbenchConfig();
  return config.get<any>('colorCustomizations', {});
}

export async function updateColorCustomizations(colorCustomizations: any): Promise<void> {
  const config = getWorkbenchConfig();
  await config.update('colorCustomizations', colorCustomizations, vscode.ConfigurationTarget.Workspace);
}

export function getWorkspaceColorMap(): Record<string, string> {
  const config = getLanternConfig();
  return config.get<Record<string, string>>('workspaceColor', {});
}

export async function updateWorkspaceColorMap(workspaceColorMap: Record<string, string>): Promise<void> {
  const config = getLanternConfig();
  await config.update('workspaceColor', workspaceColorMap, vscode.ConfigurationTarget.Global);
}

export function getWorkspaceSpecificColor(): string | null {
  const config = getLanternConfig();
  const workspaceColor = config.get<string>('color');
  return workspaceColor || null;
}

export async function setWorkspaceSpecificColor(color: string | null): Promise<void> {
  const config = getLanternConfig();
  await config.update('color', color, vscode.ConfigurationTarget.Workspace);
}

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

export function getCurrentThemeColor(_element?: string): RgbColor {
  // TODO: duplicate code, review this
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
