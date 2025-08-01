import * as vscode from 'vscode';

export interface LanternConfig {
  hueEnabled: boolean;
  hueLightIds: string[];
  hueDefaultColor: string;
  hueIntensity: number;
  workspaceColor: Record<string, string>;
  overrideDebuggingColors: boolean;
  minimal: boolean;
  peacockMode: boolean;
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

export function getWorkspaceSpecificColor(): string | undefined {
  const config = getLanternConfig();
  const workspaceColor = config.get<string>('color');
  return workspaceColor || undefined;
}

export async function setWorkspaceSpecificColor(color: string | undefined): Promise<void> {
  const config = getLanternConfig();
  await config.update('color', color, vscode.ConfigurationTarget.Workspace);
}

export function getWorkspaceColor(workspacePath: string): string | undefined {
  const workspaceSpecificColor = getWorkspaceSpecificColor();
  if (workspaceSpecificColor) {
    return workspaceSpecificColor;
  }

  const workspaceColorMap = getWorkspaceColorMap();
  if (workspaceColorMap[workspacePath]) {
    return workspaceColorMap[workspacePath];
  }

  return undefined;
}

export async function setWorkspaceColor(workspacePath: string, color: string | undefined): Promise<void> {
  if (getPeacockMode()) {
    await setPeacockColor(color);
    return;
  }

  const hasWorkspaceSpecificSetting = getWorkspaceSpecificColor() !== undefined;
  if (hasWorkspaceSpecificSetting) {
    await setWorkspaceSpecificColor(color);
  } else {
    // Create copy as settings objects are immutable
    const workspaceColorMap = { ...getWorkspaceColorMap() };
    if (color === undefined) {
      delete workspaceColorMap[workspacePath];
    } else {
      workspaceColorMap[workspacePath] = color;
    }
    await updateWorkspaceColorMap(workspaceColorMap);
  }
}

export function getOverrideDebuggingColors(): boolean {
  const config = getLanternConfig();
  return config.get<boolean>('overrideDebuggingColors', false);
}

export async function setOverrideDebuggingColors(enabled: boolean): Promise<void> {
  const config = getLanternConfig();
  await config.update('overrideDebuggingColors', enabled, vscode.ConfigurationTarget.Global);
}

export function getMinimal(): boolean {
  const config = getLanternConfig();
  return config.get<boolean>('minimal', false);
}

export async function setMinimal(enabled: boolean): Promise<void> {
  const config = getLanternConfig();
  await config.update('minimal', enabled, vscode.ConfigurationTarget.Global);
}

export function getPeacockMode(): boolean {
  const config = getLanternConfig();
  return config.get<boolean>('peacockMode', false);
}

export async function setPeacockMode(enabled: boolean): Promise<void> {
  const config = getLanternConfig();
  await config.update('peacockMode', enabled, vscode.ConfigurationTarget.Global);
}

export function getPeacockColor(): string | undefined {
  const config = vscode.workspace.getConfiguration('peacock');
  return config.get<string>('color');
}

export async function setPeacockColor(color?: string): Promise<void> {
  const config = vscode.workspace.getConfiguration('peacock');
  await config.update('color', color, vscode.ConfigurationTarget.Workspace);
}
