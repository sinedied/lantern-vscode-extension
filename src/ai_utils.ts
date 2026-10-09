export const COPILOT_VENDOR = 'copilot';
export const DEFAULT_AI_MODEL_ID = 'auto';

export interface ColorSuggestion {
  color: string;
  justification: string;
}

export interface ModelSelection<T> {
  model: T | undefined;
  requestedModelId: string;
  usedFallback: boolean;
}

export function normalizeAIModelId(modelId: string | undefined): string {
  return modelId?.trim() || DEFAULT_AI_MODEL_ID;
}

export async function selectPreferredModel<T>(
  configuredModelId: string | undefined,
  selectById: (modelId: string) => PromiseLike<readonly T[]>,
): Promise<ModelSelection<T>> {
  const requestedModelId = normalizeAIModelId(configuredModelId);
  const [configuredModel] = await selectById(requestedModelId);

  if (configuredModel) {
    return {
      model: configuredModel,
      requestedModelId,
      usedFallback: false,
    };
  }

  if (requestedModelId === DEFAULT_AI_MODEL_ID) {
    return {
      model: undefined,
      requestedModelId,
      usedFallback: false,
    };
  }

  const [autoModel] = await selectById(DEFAULT_AI_MODEL_ID);
  return {
    model: autoModel,
    requestedModelId,
    usedFallback: autoModel !== undefined,
  };
}

export function parseAIResponse(response: string): ColorSuggestion | undefined {
  try {
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
    return undefined;
  }

  return undefined;
}
