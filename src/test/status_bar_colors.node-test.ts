import assert from 'node:assert/strict';
import test from 'node:test';
import { applyNormalStatusBarColors, removeNormalStatusBarColors } from '../status_bar_colors';

test('applyNormalStatusBarColors keeps the assigned color when the window is inactive', () => {
  const colorCustomizations = applyNormalStatusBarColors(
    {
      'editor.background': '#101010',
    },
    '#ff00a0',
    '#000000',
  );

  assert.deepStrictEqual(colorCustomizations, {
    'editor.background': '#101010',
    'statusBar.background': '#ff00a0',
    'statusBar.inactiveBackground': '#ff00a0',
    'statusBar.foreground': '#000000',
  });
});

test('removeNormalStatusBarColors removes Lantern colors and preserves unrelated customizations', () => {
  const cleanup = removeNormalStatusBarColors({
    'editor.background': '#101010',
    'statusBar.background': '#ff00a0',
    'statusBar.inactiveBackground': '#ff00a0',
    'statusBar.foreground': '#000000',
  });

  assert.strictEqual(cleanup.hasChanges, true);
  assert.deepStrictEqual(cleanup.colorCustomizations, {
    'editor.background': '#101010',
  });
});

test('removeNormalStatusBarColors reports no changes when Lantern colors are absent', () => {
  const cleanup = removeNormalStatusBarColors({
    'editor.background': '#101010',
  });

  assert.strictEqual(cleanup.hasChanges, false);
  assert.deepStrictEqual(cleanup.colorCustomizations, {
    'editor.background': '#101010',
  });
});
