import * as vscode from 'vscode';
import fs from 'fs/promises';
import path from 'path';
import { getAIModel, getWorkspaceColorMap } from './config';
import { isValidHexColor } from './colors';
import { logger } from './logger';
import { ColorSuggestion, COPILOT_VENDOR, parseAIResponse, selectPreferredModel } from './ai_utils';

export { ColorSuggestion } from './ai_utils';

export const NO_COPILOT_MODELS_MESSAGE =
  'No GitHub Copilot language models are available. Sign in to GitHub Copilot and check your plan or organization model policies.';
export const AI_MODEL_UNAVAILABLE_MESSAGE =
  'The configured AI model and Copilot Auto are unavailable. Run "Lantern: Select AI model" to choose another available model.';

interface PromptContext {
  inspiration?: string;
  currentWorkspaceColor?: string;
  allUsedColors: string[];
  projectContext?: string;
}

export async function suggestColor(
  inspiration?: string,
  currentWorkspaceColor?: string,
): Promise<ColorSuggestion | undefined> {
  try {
    const configuredModelId = getAIModel();
    const selection = await selectPreferredModel(configuredModelId, (modelId) =>
      vscode.lm.selectChatModels({
        vendor: COPILOT_VENDOR,
        id: modelId,
      }),
    );

    if (!selection.model) {
      vscode.window.showErrorMessage(AI_MODEL_UNAVAILABLE_MESSAGE);
      return undefined;
    }

    if (selection.usedFallback) {
      vscode.window.showWarningMessage(
        `Configured AI model "${selection.requestedModelId}" is unavailable. Lantern is using Copilot Auto for this suggestion.`,
      );
    }

    const model = selection.model;
    logger.log(`Using AI model ${model.name} (${model.id})`);

    const allUsedColors = getAllUsedColors();
    const projectContext = await getProjectContext();

    const prompt = buildColorSuggestionPrompt({
      inspiration,
      currentWorkspaceColor,
      allUsedColors,
      projectContext,
    });

    logger.log('Requesting color suggestion from AI...');
    const cancellationTokenSource = new vscode.CancellationTokenSource();
    let response = '';

    try {
      const request = await model.sendRequest(
        [vscode.LanguageModelChatMessage.User(prompt)],
        {
          justification: 'Suggest an accessible status bar color for the current workspace.',
        },
        cancellationTokenSource.token,
      );

      for await (const fragment of request.text) {
        response += fragment;
      }
    } finally {
      cancellationTokenSource.dispose();
    }

    logger.log(`AI response: ${response}`);

    const suggestion = parseAIResponse(response);
    if (!suggestion) {
      vscode.window.showErrorMessage('Failed to parse AI response. Please try again.');
      return undefined;
    }

    if (!isValidHexColor(suggestion.color)) {
      vscode.window.showErrorMessage('AI suggested an invalid color format. Please try again.');
      return undefined;
    }

    return suggestion;
  } catch (error) {
    logger.error('Failed to suggest color with AI', error);
    const errorMessage = getLanguageModelErrorMessage(error);
    vscode.window.showErrorMessage(`Failed to suggest color with AI: ${errorMessage}`);
    return undefined;
  }
}

export function getLanguageModelErrorMessage(error: unknown): string {
  if (error instanceof vscode.LanguageModelError) {
    return `${error.message} (${error.code})`;
  }

  return error instanceof Error ? error.message : 'Unknown error';
}

function getAllUsedColors(): string[] {
  const workspaceColorMap = getWorkspaceColorMap();
  return Object.values(workspaceColorMap).filter((color) => color && color.trim() !== '');
}

export async function getProjectContext(): Promise<string | undefined> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // Look for any readme file in the workspace root
    const files = await fs.readdir(workspaceRoot);
    const readmeFile = files.find(
      (file) => file.toLowerCase().startsWith('readme.') || file.toLowerCase() === 'readme',
    );

    if (!readmeFile) {
      return undefined;
    }

    const readmePath = path.join(workspaceRoot, readmeFile);
    const readmeContent = await fs.readFile(readmePath, 'utf-8');

    // Limit content to first 5000 characters to avoid token limits
    return readmeContent.length > 5000 ? readmeContent.substring(0, 5000) + '...' : readmeContent;
  } catch {
    return undefined;
  }
}

function buildColorSuggestionPrompt(context: PromptContext): string {
  let prompt = `## Role
You are an expert color designer helping to suggest a suitable color for a VS Code status bar background.

## Task
Suggest a color that:
1. Is suitable for VS Code status bar background (readable, not too bright/dark)
2. Follows VS Code design guidelines for accessibility
3. Creates good contrast with typical status bar text (white or black)
4. Uses hex format (#RRGGBB)
5. Is different enough from current workspace color and other workspace colors, unless user inspiration takes priority

## Context
`;

  if (context.inspiration) {
    prompt += `- User inspiration/needs: "${context.inspiration}"\n`;
  }

  if (context.currentWorkspaceColor) {
    prompt += `- Current workspace color: ${context.currentWorkspaceColor}\n`;
  }

  if (context.allUsedColors.length > 0) {
    prompt += `- Colors already used in other workspaces: ${context.allUsedColors.join(', ')}\n`;
  }

  if (context.projectContext) {
    prompt += `- Project context (from README):\n<README>${context.projectContext}</README>`;
  }

  prompt += `

## Output
Respond with a JSON object in this exact format:
{
  "color": "#RRGGBB",
  "justification": "Inspiration for this color in 15-words or less. Do not start with 'Inspired by' or similar do not mention rules or guidelines."
}

The color must be:
- A valid hex color (#RRGGBB format)
- Suitable for VS Code status bar (not too bright, good contrast)
- Different enough from existing colors (unless user needs override this)
- Inspired by the user's input and/or project context when provided

Example good status bar colors: #007ACC (VS Code blue), #16825D (green), #A56C00 (orange), #7C3AED (purple), #DC2626 (red)`;

  return prompt;
}
