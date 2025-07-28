import path from 'path';
import { getWorkspaceColorMap, getWorkspaceColor, setWorkspaceColor } from './config';
import { isValidHexColor } from './colors';
import { getProjectContext } from './ai';
import { Lantern } from './lantern';
import { logger } from './logger';

export interface SetWorkspaceColorToolParams {
  color: string;
  workspacePath?: string;
}

export interface GetWorkspaceColorsToolParams {
  includeProjectContext?: boolean;
}

export interface WorkspaceColorsContext {
  currentWorkspace?: {
    path: string;
    color?: string;
  };
  allWorkspaceColors: Record<string, string>;
  projectContext?: string;
}

export async function setWorkspaceColorTool(
  lantern: Lantern,
  params: SetWorkspaceColorToolParams,
): Promise<{ success: boolean; message: string }> {
  try {
    const { color, workspacePath } = params;

    if (!isValidHexColor(color)) {
      return {
        success: false,
        message: `Invalid color format: ${color}. Expected hex format like #RRGGBB.`,
      };
    }

    // Determine workspace path
    let targetWorkspacePath = workspacePath ?? lantern.getCurrentWorkspacePath();
    if (!targetWorkspacePath) {
      return {
        success: false,
        message: 'Invalid workspace path or no workspace is currently open.',
      };
    }

    await setWorkspaceColor(targetWorkspacePath, color);

    return {
      success: true,
      message: `Successfully set workspace color to ${color} for ${path.basename(targetWorkspacePath)}.`,
    };
  } catch (error) {
    logger.log(`Error setting workspace color: ${error}`);
    return {
      success: false,
      message: `Failed to set workspace color: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function getWorkspaceColorsAndContextTool(
  lantern: Lantern,
  params: GetWorkspaceColorsToolParams = {},
): Promise<WorkspaceColorsContext> {
  try {
    const { includeProjectContext = true } = params;

    // Get current workspace info
    const currentWorkspacePath = lantern.getCurrentWorkspacePath();
    let currentWorkspace: { path: string; color?: string } | undefined;
    if (currentWorkspacePath) {
      const color = getWorkspaceColor(currentWorkspacePath);
      currentWorkspace = {
        path: currentWorkspacePath,
        color,
      };
    }

    // Get all workspace colors
    const allWorkspaceColors = getWorkspaceColorMap();

    // Get project context if requested
    let projectContext: string | undefined;
    if (includeProjectContext) {
      projectContext = await getProjectContext();
    }

    return {
      currentWorkspace,
      allWorkspaceColors,
      projectContext,
    };
  } catch (error) {
    logger.log(`Error getting workspace colors and context: ${error}`);
    return {
      allWorkspaceColors: {},
    };
  }
}

export const SET_WORKSPACE_COLOR_TOOL_INFO = {
  name: 'set_workspace_color',
  description: 'Set the color for the current or specified workspace. Use hex format like #RRGGBB.',
  inputSchema: {
    type: 'object',
    properties: {
      color: {
        type: 'string',
        description: 'The hex color code to set (e.g., #ff0000)',
        pattern: '^#[0-9A-Fa-f]{6}$',
      },
      workspacePath: {
        type: 'string',
        description: 'Optional workspace path. If not provided, uses current workspace',
      },
    },
    required: ['color'],
  },
};

export const GET_WORKSPACE_COLORS_TOOL_INFO = {
  name: 'get_workspace_colors_and_context',
  description: 'Get information about current workspace colors, all used colors, and project context from README.',
  inputSchema: {
    type: 'object',
    properties: {
      includeProjectContext: {
        type: 'boolean',
        description: 'Whether to include project context from README files (default: true)',
        default: true,
      },
    },
  },
};
