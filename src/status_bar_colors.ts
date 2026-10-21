const NORMAL_STATUS_BAR_COLOR_KEYS = [
  'statusBar.background',
  'statusBar.inactiveBackground',
  'statusBar.foreground',
] as const;

export interface ColorCustomizationsCleanup {
  colorCustomizations: Record<string, unknown>;
  hasChanges: boolean;
}

export function applyNormalStatusBarColors(
  currentColorCustomizations: Record<string, unknown>,
  backgroundColor: string,
  foregroundColor: string,
): Record<string, unknown> {
  return {
    ...currentColorCustomizations,
    'statusBar.background': backgroundColor,
    'statusBar.inactiveBackground': backgroundColor,
    'statusBar.foreground': foregroundColor,
  };
}

export function removeNormalStatusBarColors(
  currentColorCustomizations: Record<string, unknown>,
): ColorCustomizationsCleanup {
  const colorCustomizations = { ...currentColorCustomizations };
  let hasChanges = false;

  for (const key of NORMAL_STATUS_BAR_COLOR_KEYS) {
    if (Object.prototype.hasOwnProperty.call(colorCustomizations, key)) {
      delete colorCustomizations[key];
      hasChanges = true;
    }
  }

  return { colorCustomizations, hasChanges };
}
