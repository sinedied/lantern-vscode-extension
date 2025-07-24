import * as assert from 'assert';
import * as vscode from 'vscode';
import { rgbToHex, hexToRgb, generateRandomColorVariant, rgbToOklch, oklchToRgb } from '../color-utils';

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

    // Test random color variant generation
    const baseColor = { r: 100, g: 150, b: 200 };
    const variant1 = generateRandomColorVariant(baseColor);
    const variant2 = generateRandomColorVariant(baseColor);

    // Variants should be different colors
    assert.notDeepStrictEqual(variant1, variant2);

    // But should have similar lightness and chroma in OKLCH space
    const baseOklch = rgbToOklch(baseColor);
    const variant1Oklch = rgbToOklch(variant1);
    const variant2Oklch = rgbToOklch(variant2);

    const lightnessTolerrance = 0.1;
    const chromaTolerance = 0.1;

    assert.ok(Math.abs(variant1Oklch.l - baseOklch.l) <= lightnessTolerrance);
    assert.ok(Math.abs(variant1Oklch.c - baseOklch.c) <= chromaTolerance);
    assert.ok(Math.abs(variant2Oklch.l - baseOklch.l) <= lightnessTolerrance);
    assert.ok(Math.abs(variant2Oklch.c - baseOklch.c) <= chromaTolerance);
  });

  test('Extension commands are registered', async () => {
    // Get all available commands
    const commands = await vscode.commands.getCommands(true);

    // Check that our commands are registered
    assert.ok(commands.includes('lantern.assignUniqueColor'));
    assert.ok(commands.includes('lantern.enableHueIntegration'));
    assert.ok(commands.includes('lantern.disableHueIntegration'));
    assert.ok(commands.includes('lantern.resetColors'));
  });
});
