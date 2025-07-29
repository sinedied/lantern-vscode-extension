import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  rgbToHex,
  hexToRgb,
  generateRandomColor,
  rgbToOklch,
  oklchToRgb,
  calculateColorDistance,
  isValidHexColor,
  getContrastingTextColor,
} from '../colors';
import {
  getEnabled,
  setEnabled,
  getWorkspaceColor,
  setWorkspaceColor,
  getWorkspaceColorMap,
  updateWorkspaceColorMap,
  getOverrideDebuggingColors,
  setOverrideDebuggingColors,
  getMinimal,
  setMinimal,
} from '../config';
import { logger } from '../logger';

suite('Lantern Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Color utility functions work correctly', () => {
    // Test RGB to hex conversion
    const red = { r: 255, g: 0, b: 0 };
    const redHex = rgbToHex(red);
    assert.strictEqual(redHex, '#ff0000');

    // Test hex to RGB conversion including 8-character hex
    const blueRgb = hexToRgb('#0000ff');
    assert.deepStrictEqual(blueRgb, { r: 0, g: 0, b: 255 });

    // Test 3-character hex
    const shortRedRgb = hexToRgb('#f00');
    assert.deepStrictEqual(shortRedRgb, { r: 255, g: 0, b: 0 });

    // Test 8-character hex (RGBA - alpha is ignored)
    const rgbaRgb = hexToRgb('#ff0000ff');
    assert.deepStrictEqual(rgbaRgb, { r: 255, g: 0, b: 0 });

    // Test hex validation
    assert.ok(isValidHexColor('#ff0000'), '6-character hex should be valid');
    assert.ok(isValidHexColor('#f00'), '3-character hex should be valid');
    assert.ok(isValidHexColor('#ff0000ff'), '8-character hex should be valid');
    assert.ok(!isValidHexColor('ff0000'), 'Missing # should be invalid');
    assert.ok(!isValidHexColor('#gg0000'), 'Invalid characters should be invalid');
    assert.ok(!isValidHexColor('#ff00'), '4-character hex should be invalid');
    assert.ok(!isValidHexColor('#ff000'), '5-character hex should be invalid');
    assert.ok(!isValidHexColor('#ff00000'), '7-character hex should be invalid');
    assert.ok(!isValidHexColor('#ff000000f'), '9-character hex should be invalid');
    assert.ok(!isValidHexColor(''), 'Empty string should be invalid');
    assert.ok(!isValidHexColor('red'), 'Named colors should be invalid');

    // Test OKLCH color space conversion (round trip)
    const originalColor = { r: 128, g: 64, b: 192 };
    const oklch = rgbToOklch(originalColor);
    const convertedBack = oklchToRgb(oklch);

    // Allow for small rounding errors in color space conversion
    const tolerance = 2;
    assert.ok(Math.abs(convertedBack.r - originalColor.r) <= tolerance);
    assert.ok(Math.abs(convertedBack.g - originalColor.g) <= tolerance);
    assert.ok(Math.abs(convertedBack.b - originalColor.b) <= tolerance);

    // Test improved random color variant generation
    const baseColor = { r: 100, g: 150, b: 200 };
    const variant1 = generateRandomColor(baseColor);
    const variant2 = generateRandomColor(baseColor);

    // Variants should be different colors
    assert.notDeepStrictEqual(variant1, variant2);

    // Test that colors avoid existing colors when provided
    const existingColor = { r: 255, g: 0, b: 0 }; // Red
    const avoidingVariant = generateRandomColor(existingColor);

    // Check that the new color is sufficiently different from the existing one
    const existingOklch = rgbToOklch(existingColor);
    const avoidingOklch = rgbToOklch(avoidingVariant);
    const distance = calculateColorDistance(existingOklch, avoidingOklch);

    // Should have reasonable distance (at least 0.1 in perceptual space)
    assert.ok(distance > 0.1, `Color distance ${distance} should be > 0.1`);
  });

  test('getContrastingTextColor returns appropriate text colors', () => {
    // Test with pure black background - should return white text
    const blackBackground = { r: 0, g: 0, b: 0 };
    assert.strictEqual(getContrastingTextColor(blackBackground), '#ffffff');

    // Test with pure white background - should return black text
    const whiteBackground = { r: 255, g: 255, b: 255 };
    assert.strictEqual(getContrastingTextColor(whiteBackground), '#000000');

    // Test with dark gray background - should return white text
    const darkGrayBackground = { r: 50, g: 50, b: 50 };
    assert.strictEqual(getContrastingTextColor(darkGrayBackground), '#ffffff');

    // Test with light gray background - should return black text
    const lightGrayBackground = { r: 200, g: 200, b: 200 };
    assert.strictEqual(getContrastingTextColor(lightGrayBackground), '#000000');

    // Test with dark red background - should return white text
    const darkRedBackground = { r: 128, g: 0, b: 0 };
    assert.strictEqual(getContrastingTextColor(darkRedBackground), '#ffffff');

    // Test with light yellow background - should return black text
    const lightYellowBackground = { r: 255, g: 255, b: 200 };
    assert.strictEqual(getContrastingTextColor(lightYellowBackground), '#000000');

    // Test light orange background (should return black text)
    const lightOrangeBackground = { r: 255, g: 165, b: 0 };
    const lightOrangeTextColor = getContrastingTextColor(lightOrangeBackground);
    assert.ok(lightOrangeTextColor === '#000000', 'Should return black');
  });

  test('Color distance calculation works correctly', () => {
    // Test that identical colors have zero distance
    const color1 = { l: 0.5, c: 0.1, h: 180 };
    const color2 = { l: 0.5, c: 0.1, h: 180 };
    assert.strictEqual(calculateColorDistance(color1, color2), 0);

    // Test that very different colors have large distance
    const redish = { l: 0.6, c: 0.2, h: 0 };
    const blueish = { l: 0.4, c: 0.2, h: 240 };
    const distance = calculateColorDistance(redish, blueish);
    assert.ok(distance > 0.5, `Distance ${distance} should be > 0.5 for very different colors`);

    // Test hue wrapping (0 and 360 should be close)
    const hue0 = { l: 0.5, c: 0.1, h: 0 };
    const hue360 = { l: 0.5, c: 0.1, h: 360 };
    const hue5 = { l: 0.5, c: 0.1, h: 5 };
    const distanceWrap = calculateColorDistance(hue0, hue360);
    const distanceClose = calculateColorDistance(hue0, hue5);
    assert.ok(distanceWrap < 0.1, 'Hue 0 and 360 should be very close');
    assert.ok(distanceClose < 0.1, 'Hue 0 and 5 should be very close');
  });

  test('Extension commands are registered', async () => {
    // Wait a bit for extension to fully activate
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get all available commands
    const commands = await vscode.commands.getCommands(true);

    // Check that our commands are registered
    assert.ok(commands.includes('lantern.assignUniqueColor'), 'assignUniqueColor command not found');
    assert.ok(commands.includes('lantern.assignColorManually'), 'assignColorManually command not found');
    assert.ok(commands.includes('lantern.toggle'), 'toggle command not found');
    assert.ok(commands.includes('lantern.enableHue'), 'enableHue command not found');
    assert.ok(commands.includes('lantern.disableHue'), 'disableHue command not found');
    assert.ok(commands.includes('lantern.setHueIntensity'), 'setHueIntensity command not found');
    assert.ok(commands.includes('lantern.resetWorkspaceColor'), 'resetWorkspaceColor command not found');
    assert.ok(commands.includes('lantern.showCommands'), 'showCommands command not found');
  });

  test('Global toggle configuration works correctly', async () => {
    // Test getting initial global toggle state (should default to true)
    const initialState = getEnabled();
    assert.strictEqual(typeof initialState, 'boolean');

    // Test setting global toggle to false
    await setEnabled(false);
    const disabledState = getEnabled();
    assert.strictEqual(disabledState, false);

    // Test setting global toggle to true
    await setEnabled(true);
    const enabledState = getEnabled();
    assert.strictEqual(enabledState, true);
  });

  test('Override debugging colors configuration works correctly', async () => {
    // Test getting initial debugging colors override state (should default to false)
    const initialState = getOverrideDebuggingColors();
    assert.strictEqual(typeof initialState, 'boolean');
    assert.strictEqual(initialState, false);

    // Test setting debugging colors override to true
    await setOverrideDebuggingColors(true);
    const enabledState = getOverrideDebuggingColors();
    assert.strictEqual(enabledState, true);

    // Test setting debugging colors override to false
    await setOverrideDebuggingColors(false);
    const disabledState = getOverrideDebuggingColors();
    assert.strictEqual(disabledState, false);
  });

  test('Minimal mode configuration works correctly', async () => {
    // Test getting initial minimal mode state (should default to false)
    const initialState = getMinimal();
    assert.strictEqual(typeof initialState, 'boolean');
    assert.strictEqual(initialState, false);

    // Test setting minimal mode to true
    await setMinimal(true);
    const enabledState = getMinimal();
    assert.strictEqual(enabledState, true);

    // Test setting minimal mode to false
    await setMinimal(false);
    const disabledState = getMinimal();
    assert.strictEqual(disabledState, false);
  });

  test('Workspace color system works correctly', async () => {
    const testWorkspacePath = '/test/workspace';
    const testColor = '#ff0000';

    // Test setting and getting workspace color
    await setWorkspaceColor(testWorkspacePath, testColor);
    const retrievedColor = getWorkspaceColor(testWorkspacePath);
    assert.strictEqual(retrievedColor, testColor);

    // Test that the color appears in the global map
    const colorMap = getWorkspaceColorMap();
    assert.strictEqual(colorMap[testWorkspacePath], testColor);

    // Clean up
    const updatedMap = { ...colorMap };
    delete updatedMap[testWorkspacePath];
    await updateWorkspaceColorMap(updatedMap);
  });
});

suite('Logger Tests', () => {
  test('Logger should be defined and have required methods', () => {
    assert.ok(logger);
    assert.strictEqual(typeof logger.log, 'function');
    assert.strictEqual(typeof logger.error, 'function');
    assert.strictEqual(typeof logger.warn, 'function');
    assert.strictEqual(typeof logger.info, 'function');
    assert.strictEqual(typeof logger.show, 'function');
    assert.strictEqual(typeof logger.dispose, 'function');
  });

  test('Logger methods should not throw errors', () => {
    assert.doesNotThrow(() => {
      logger.log('Test log message');
      logger.error('Test error message');
      logger.warn('Test warning message');
      logger.info('Test info message');
    });
  });
});
