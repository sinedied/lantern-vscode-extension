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

test('applying and removing colors preserves nested theme customizations', () => {
  const current = {
    'editor.background': '#101010',
    '[Default Dark Modern]': {
      'editor.background': '#202020',
      'statusBar.background': '#303030',
    },
  };
  const applied = applyNormalStatusBarColors(current, '#ff00a0', '#000000');
  const cleanup = removeNormalStatusBarColors(applied);

  assert.deepStrictEqual(cleanup.colorCustomizations, current);
  assert.strictEqual(applied['[Default Dark Modern]'], current['[Default Dark Modern]']);
  assert.strictEqual(cleanup.colorCustomizations['[Default Dark Modern]'], current['[Default Dark Modern]']);
  assert.strictEqual(current['editor.background'], '#101010');
});
