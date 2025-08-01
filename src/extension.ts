import * as vscode from 'vscode';
import { Lantern } from './lantern';
import { getEnabled, getPeacockSync } from './config';
import { logger } from './logger';
import {
  setWorkspaceColorTool,
  getWorkspaceColorsAndContextTool,
  SET_WORKSPACE_COLOR_TOOL_INFO,
  GET_WORKSPACE_COLORS_TOOL_INFO,
  SetWorkspaceColorToolParams,
  GetWorkspaceColorsToolParams,
} from './tools';
import path from 'path';

let lantern: Lantern;

// This method is called when extension is activated
export function activate(context: vscode.ExtensionContext) {
  logger.log('Lantern extension loaded');

  lantern = new Lantern();

  // Apply current settings (async)
  lantern.updateStatusBar();
  lantern.applyWorkspaceColor();

  // Listen for workspace folder changes to update colors and Hue lights
  const workspaceFoldersDisposable = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
    await lantern.applyWorkspaceColor();
  });

  // Listen for window state changes to update Hue lights when window becomes active
  const windowStateDisposable = vscode.window.onDidChangeWindowState(async (windowState) => {
    if (windowState.focused) {
      await lantern.applyWorkspaceColor();
    }
  });

  // Listen for configuration changes to update colors and Hue lights when settings change
  const configurationDisposable = vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration('lantern')) {

      // When switching minimal mode we need to reset colors temporarily first
      if (event.affectsConfiguration('lantern.minimal')) {
        await lantern.resetAppliedColors();
      }

      await lantern.applyWorkspaceColor();
    }

    // Watch for peacock.color changes when in peacock sync mode
    if (getPeacockSync() && event.affectsConfiguration('peacock.color')) {
      await lantern.applyWorkspaceColor();
    }
  });

  const assignColorDisposable = vscode.commands.registerCommand('lantern.assignUniqueColor', async () => {
    await lantern.assignUniqueColor();
  });
  const assignColorManuallyDisposable = vscode.commands.registerCommand('lantern.assignColorManually', async () => {
    await lantern.assignColorManually();
  });
  const suggestColorWithAIDisposable = vscode.commands.registerCommand('lantern.suggestColorWithAI', async () => {
    await lantern.suggestColorWithAI();
  });
  const toggleDisposable = vscode.commands.registerCommand('lantern.toggle', async () => {
    await lantern.toggleLantern();
  });
  const enableHueDisposable = vscode.commands.registerCommand('lantern.enableHue', async () => {
    await lantern.enableHue();
  });
  const disableHueDisposable = vscode.commands.registerCommand('lantern.disableHue', async () => {
    await lantern.disableHue();
  });
  const setHueIntensityDisposable = vscode.commands.registerCommand('lantern.setHueIntensity', async () => {
    await lantern.setHueIntensity();
  });
  const resetWorkspaceColorDisposable = vscode.commands.registerCommand('lantern.resetWorkspaceColor', async () => {
    await lantern.resetWorkspaceColor();
  });
  const showCommandsDisposable = vscode.commands.registerCommand('lantern.showCommands', async () => {
    await showLanternCommands();
  });

  const toggleMinimalDisposable = vscode.commands.registerCommand('lantern.toggleMinimal', async () => {
    await lantern.toggleMinimal();
  });

  const togglePeacockSyncDisposable = vscode.commands.registerCommand('lantern.togglePeacockSync', async () => {
    await lantern.togglePeacockSync();
  });

  // Register Language Model Tools
  const setWorkspaceColorToolDisposable = vscode.lm.registerTool(
    SET_WORKSPACE_COLOR_TOOL_INFO.name,
    {
      async invoke(
        options: vscode.LanguageModelToolInvocationOptions<SetWorkspaceColorToolParams>,
      ): Promise<vscode.LanguageModelToolResult> {
        const result = await setWorkspaceColorTool(lantern, options.input);
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
        ]);
      },

      async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<SetWorkspaceColorToolParams>,
      ): Promise<vscode.PreparedToolInvocation> {
        const { color, workspacePath } = options.input;
        const workspaceName = workspacePath ? path.basename(workspacePath) : 'current workspace';

        return {
          invocationMessage: `Setting workspace color to ${color} for ${workspaceName}...`,
        };
      },
    },
  );
  const getWorkspaceColorsToolDisposable = vscode.lm.registerTool(
    GET_WORKSPACE_COLORS_TOOL_INFO.name,
      {
        async invoke(
          options: vscode.LanguageModelToolInvocationOptions<GetWorkspaceColorsToolParams>,
        ): Promise<vscode.LanguageModelToolResult> {
          const result = await getWorkspaceColorsAndContextTool(lantern, options.input);
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
          ]);
        },

        async prepareInvocation(): Promise<vscode.PreparedToolInvocation> {
          return {
            invocationMessage: 'Getting workspace colors and context...',
          };
        },
    },
  );

  context.subscriptions.push(
    assignColorDisposable,
    assignColorManuallyDisposable,
    suggestColorWithAIDisposable,
    toggleDisposable,
    enableHueDisposable,
    disableHueDisposable,
    setHueIntensityDisposable,
    resetWorkspaceColorDisposable,
    showCommandsDisposable,
    toggleMinimalDisposable,
    togglePeacockSyncDisposable,
    setWorkspaceColorToolDisposable,
    getWorkspaceColorsToolDisposable,
    workspaceFoldersDisposable,
    windowStateDisposable,
    configurationDisposable,
    lantern,
  );
}

async function showLanternCommands(): Promise<void> {
  const isEnabled = getEnabled();
  const peacockSync = getPeacockSync();
  const commands = [
    {
      label: isEnabled ? '$(lantern-off) Turn off Lantern' : '$(lantern-on) Turn on Lantern',
      description: isEnabled ? 'Disable all Lantern functionality' : 'Enable all Lantern functionality',
      command: 'lantern.toggle',
    },
    {
      label: '$(symbol-color) Assign unique color',
      description: 'Assign a unique color to this workspace',
      command: 'lantern.assignUniqueColor',
    },
    {
      label: '$(color-mode) Assign color manually',
      description: 'Assign a custom color (e.g., #0000ff)',
      command: 'lantern.assignColorManually',
    },
    {
      label: '$(sparkle) Suggest color with AI',
      description: 'Get an AI-powered color suggestion',
      command: 'lantern.suggestColorWithAI',
    },
    {
      label: '$(refresh) Reset workspace color',
      description: 'Remove assigned color',
      command: 'lantern.resetWorkspaceColor',
    },
    {
      label: peacockSync ? '$(sync-ignored) Disable Peacock sync' : '$(sync) Enable Peacock sync',
      description: 'Use Peacock extension instead of built-in theming',
      command: 'lantern.togglePeacockSync',
    },
    {
      label: '$(lightbulb) Enable Philips Hue',
      description: 'Connect to Philips Hue lights',
      command: 'lantern.enableHue',
    },
    {
      label: '$(lightbulb-empty) Disable Philips Hue',
      description: 'Disconnect from Philips Hue lights',
      command: 'lantern.disableHue',
    },
    {
      label: '$(lightbulb-sparkle) Set Philips Hue intensity',
      description: 'Adjust brightness of Philips Hue lights (0-100%)',
      command: 'lantern.setHueIntensity',
    },
    {
      label: '$(circle-small-filled) Toggle minimal mode',
      description: 'Minimal mode only colorizes the status bar item',
      command: 'lantern.toggleMinimal',
    },
  ];

  const selectedCommand = await vscode.window.showQuickPick(commands, {
    placeHolder: 'Select a Lantern command',
    title: 'Lantern Commands',
  });

  if (selectedCommand) {
    await vscode.commands.executeCommand(selectedCommand.command);
  }
}

// This method is called when extension is deactivated
export function deactivate() {}
