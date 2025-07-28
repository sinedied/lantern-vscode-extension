import * as vscode from 'vscode';
import fs from 'fs/promises';
import path from 'path';
import { getWorkspaceColorMap } from './config';
import { isValidHexColor } from './colors';
import { logger } from './logger';

export interface ColorSuggestion {
  color: string;
  justification: string;
}

interface PromptContext {
  inspiration?: string;
  currentWorkspaceColor?: string;
  allUsedColors: string[];
  projectContext?: string;
}

export async function suggestColor(inspiration?: string, currentWorkspaceColor?: string): Promise<ColorSuggestion | undefined> {
  try {
    const models = await vscode.lm.selectChatModels({
      vendor: 'copilot',
      family: 'gpt-4o',
    });

    if (models.length === 0) {
      vscode.window.showErrorMessage('No suitable language model found. Please ensure GitHub Copilot is enabled.');
      return undefined;
    }

    const model = models[0];

    // Get extra context information
    const allUsedColors = getAllUsedColors();
    const projectContext = await getProjectContext();

    const prompt = buildColorSuggestionPrompt({
      inspiration,
      currentWorkspaceColor,
      allUsedColors,
      projectContext,
    });

    logger.log('Requesting color suggestion from AI...');
    const request = await model.sendRequest([vscode.LanguageModelChatMessage.User(prompt)], {}, new vscode.CancellationTokenSource().token);

    let response = '';
    for await (const fragment of request.text) {
      response += fragment;
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
    logger.log(`Error suggesting color with AI: ${error}`);
    vscode.window.showErrorMessage(`Failed to suggest color with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return undefined;
  }
}

function getAllUsedColors(): string[] {
  const workspaceColorMap = getWorkspaceColorMap();
  return Object.values(workspaceColorMap).filter(color => color && color.trim() !== '');
}

async function getProjectContext(): Promise<string | undefined> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    // TODO: look for any file named "readme.*", case-insensitive
    const readmePath = path.join(workspaceFolders[0].uri.fsPath, 'README.md');
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
3. Creates good contrast with typical status bar text (white/light text)
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
  "justification": "One-line explanation of why this color was chosen"
}

The color must be:
- A valid hex color (#RRGGBB format)
- Suitable for VS Code status bar (not too bright, good contrast)
- Different enough from existing colors (unless user needs override this)
- Inspired by the user's input and/or project context when provided

Example good status bar colors: #007ACC (VS Code blue), #16825D (green), #A56C00 (orange), #7C3AED (purple), #DC2626 (red)`;

  return prompt;
}

function parseAIResponse(response: string): ColorSuggestion | undefined {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return undefined;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (typeof parsed.color === 'string' && typeof parsed.justification === 'string') {
      return {
        color: parsed.color.trim(),
        justification: parsed.justification.trim(),
      };
    }

  } catch {
    // Do nothing if parsing fails, just return undefined
  }
  return undefined;
}
