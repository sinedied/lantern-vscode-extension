import * as assert from 'assert';
import * as vscode from 'vscode';
import { rgbToHex, hexToRgb, generateRandomColorVariant, generateRandomHueVariant, rgbToOklch, oklchToRgb, parseCssColor, calculateColorDistance } from '../colors';
import { getGlobalToggleEnabled, setGlobalToggleEnabled, getCurrentThemeColor } from '../config';

suite('Lantern Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Color utility functions work correctly', () => {
    // Test RGB to hex conversion
    const red = { r: 255, g: 0, b: 0 };
    const redHex = rgbToHex(red);
    assert.strictEqual(redHex, '#ff0000');

    // Test hex to RGB conversion
    const blueRgb = hexToRgb('#0000ff');
    assert.deepStrictEqual(blueRgb, { r: 0, g: 0, b: 255 });

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
    const variant1 = generateRandomColorVariant(baseColor);
    const variant2 = generateRandomColorVariant(baseColor);

    // Variants should be different colors
    assert.notDeepStrictEqual(variant1, variant2);

    // Test that colors avoid existing colors when provided
    const existingColor = { r: 255, g: 0, b: 0 }; // Red
    const avoidingVariant = generateRandomColorVariant(baseColor, existingColor);
    
    // Check that the new color is sufficiently different from the existing one
    const existingOklch = rgbToOklch(existingColor);
    const avoidingOklch = rgbToOklch(avoidingVariant);
    const distance = calculateColorDistance(existingOklch, avoidingOklch);
    
    // Should have reasonable distance (at least 0.1 in perceptual space)
    assert.ok(distance > 0.1, `Color distance ${distance} should be > 0.1`);

    // Test legacy random hue variant generation
    const hueVariant1 = generateRandomHueVariant(baseColor);
    const hueVariant2 = generateRandomHueVariant(baseColor);

    // Variants should be different colors
    assert.notDeepStrictEqual(hueVariant1, hueVariant2);

    // But should have similar lightness and chroma in OKLCH space
    const baseOklch = rgbToOklch(baseColor);
    const hueVariant1Oklch = rgbToOklch(hueVariant1);
    const hueVariant2Oklch = rgbToOklch(hueVariant2);

    const lightnessTolerance = 0.1;
    const chromaTolerance = 0.1;

    assert.ok(Math.abs(hueVariant1Oklch.l - baseOklch.l) <= lightnessTolerance);
    assert.ok(Math.abs(hueVariant1Oklch.c - baseOklch.c) <= chromaTolerance);
    assert.ok(Math.abs(hueVariant2Oklch.l - baseOklch.l) <= lightnessTolerance);
    assert.ok(Math.abs(hueVariant2Oklch.c - baseOklch.c) <= chromaTolerance);

    // Test CSS color parsing (simplified - no longer validates, just parses what it can)
    assert.deepStrictEqual(parseCssColor('#ff0000'), { r: 255, g: 0, b: 0 });
    assert.deepStrictEqual(parseCssColor('#f00'), { r: 255, g: 0, b: 0 });
    // Non-hex colors return neutral gray for Hue integration
    assert.deepStrictEqual(parseCssColor('red'), { r: 128, g: 128, b: 128 });
    assert.deepStrictEqual(parseCssColor('rgb(0, 255, 0)'), { r: 128, g: 128, b: 128 });
    assert.deepStrictEqual(parseCssColor('oklch(0.7 0.15 180)'), { r: 128, g: 128, b: 128 });
    assert.strictEqual(parseCssColor(''), null);
    assert.strictEqual(parseCssColor('   '), null);
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
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get all available commands
    const commands = await vscode.commands.getCommands(true);

    // Check that our commands are registered
    assert.ok(commands.includes('lantern.assignUniqueColor'), 'assignUniqueColor command not found');
    assert.ok(commands.includes('lantern.setColorManually'), 'setColorManually command not found');
    assert.ok(commands.includes('lantern.toggleGlobal'), 'toggleGlobal command not found');
    assert.ok(commands.includes('lantern.enableHueIntegration'), 'enableHueIntegration command not found');
    assert.ok(commands.includes('lantern.disableHueIntegration'), 'disableHueIntegration command not found');
    assert.ok(commands.includes('lantern.setHueIntensity'), 'setHueIntensity command not found');
    assert.ok(commands.includes('lantern.resetColors'), 'resetColors command not found');
    assert.ok(commands.includes('lantern.statusBarIndicatorClicked'), 'statusBarIndicatorClicked command not found');
  });

  test('Configuration and color functions work correctly', () => {
    // Test that getCurrentThemeColor works for status bar
    const statusBarColor = getCurrentThemeColor();
    assert.ok(statusBarColor.r !== undefined);
    assert.ok(statusBarColor.g !== undefined);
    assert.ok(statusBarColor.b !== undefined);
  });

  test('Global toggle configuration works correctly', async () => {
    // Test getting initial global toggle state (should default to true)
    const initialState = getGlobalToggleEnabled();
    assert.strictEqual(typeof initialState, 'boolean');

    // Test setting global toggle to false
    await setGlobalToggleEnabled(false);
    const disabledState = getGlobalToggleEnabled();
    assert.strictEqual(disabledState, false);

    // Test setting global toggle to true
    await setGlobalToggleEnabled(true);
    const enabledState = getGlobalToggleEnabled();
    assert.strictEqual(enabledState, true);
  });
});
