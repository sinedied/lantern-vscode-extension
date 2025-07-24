// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ColorService } from './colorService';
import { PhilipsHueService } from './hueService';

let colorService: ColorService;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "lantern" is now active!');

	// Initialize the color service
	colorService = new ColorService();

	// Apply stored colors when the extension activates
	colorService.applyStoredColors();

	// Register the assign unique color command
	const assignColorDisposable = vscode.commands.registerCommand('lantern.assignUniqueColor', async () => {
		await colorService.assignUniqueColor();
	});

	// Register the enable Hue integration command
	const enableHueDisposable = vscode.commands.registerCommand('lantern.enableHueIntegration', async () => {
		await enableHueIntegration();
	});

	// Register the disable Hue integration command
	const disableHueDisposable = vscode.commands.registerCommand('lantern.disableHueIntegration', async () => {
		await disableHueIntegration();
	});

	// Register the reset colors command
	const resetColorsDisposable = vscode.commands.registerCommand('lantern.resetColors', async () => {
		await colorService.resetColors();
	});

	context.subscriptions.push(
		assignColorDisposable,
		enableHueDisposable,
		disableHueDisposable,
		resetColorsDisposable
	);
}

async function enableHueIntegration(): Promise<void> {
	const hueService = colorService.getHueService();

	try {
		// Check if already configured
		if (hueService.isConfigured()) {
			const testConnection = await hueService.testConnection();
			if (testConnection) {
				// Already configured and working, just enable
				const config = vscode.workspace.getConfiguration('lantern');
				await config.update('hueIntegrationEnabled', true, vscode.ConfigurationTarget.Global);
				
				// Let user select lights
				await selectHueLights();
				return;
			}
		}

		vscode.window.showInformationMessage('Setting up Philips Hue integration...');

		// Discover bridges
		const bridges = await hueService.discoverBridges();
		if (bridges.length === 0) {
			vscode.window.showErrorMessage('No Philips Hue bridges found on the network. Make sure your bridge is connected and on the same network.');
			return;
		}

		// Select bridge if multiple found
		let selectedBridge = bridges[0];
		if (bridges.length > 1) {
			const bridgeOptions = bridges.map(bridge => ({
				label: `Bridge at ${bridge.ip}`,
				bridge
			}));

			const selection = await vscode.window.showQuickPick(bridgeOptions, {
				placeHolder: 'Select a Philips Hue bridge'
			});

			if (!selection) {
				return;
			}

			selectedBridge = selection.bridge;
		}

		// Show instructions for bridge button press
		const buttonPressed = await vscode.window.showInformationMessage(
			'Press the button on your Philips Hue bridge, then click "Continue" within 2 minutes.',
			'Continue',
			'Cancel'
		);

		if (buttonPressed !== 'Continue') {
			return;
		}

		// Create user
		try {
			const username = await hueService.createUser(selectedBridge.ip);
			if (!username) {
				vscode.window.showErrorMessage('Failed to connect to Hue bridge. Make sure you pressed the button.');
				return;
			}

			// Enable integration
			const config = vscode.workspace.getConfiguration('lantern');
			await config.update('hueIntegrationEnabled', true, vscode.ConfigurationTarget.Global);

			vscode.window.showInformationMessage('Philips Hue integration enabled successfully!');

			// Let user select lights
			await selectHueLights();

		} catch (error: any) {
			if (error.message?.includes('link button not pressed')) {
				vscode.window.showErrorMessage('Bridge button was not pressed. Please try again and press the button on your Hue bridge.');
			} else {
				vscode.window.showErrorMessage(`Failed to connect to Hue bridge: ${error.message}`);
			}
		}

	} catch (error: any) {
		vscode.window.showErrorMessage(`Failed to setup Hue integration: ${error.message}`);
	}
}

async function selectHueLights(): Promise<void> {
	const hueService = colorService.getHueService();

	try {
		const lights = await hueService.getLights();
		if (lights.length === 0) {
			vscode.window.showWarningMessage('No Hue lights found.');
			return;
		}

		const lightOptions = lights.map(light => ({
			label: light.name,
			description: `ID: ${light.id}`,
			picked: false,
			lightId: light.id
		}));

		const selectedLights = await vscode.window.showQuickPick(lightOptions, {
			placeHolder: 'Select which lights to control (you can select multiple)',
			canPickMany: true
		});

		if (!selectedLights || selectedLights.length === 0) {
			vscode.window.showInformationMessage('No lights selected. You can change this later in settings.');
			return;
		}

		const lightIds = selectedLights.map(light => light.lightId);
		const config = vscode.workspace.getConfiguration('lantern');
		await config.update('hueLightIds', lightIds, vscode.ConfigurationTarget.Global);

		const lightNames = selectedLights.map(light => light.label).join(', ');
		vscode.window.showInformationMessage(`Selected lights: ${lightNames}`);

	} catch (error: any) {
		vscode.window.showErrorMessage(`Failed to get Hue lights: ${error.message}`);
	}
}

async function disableHueIntegration(): Promise<void> {
	const config = vscode.workspace.getConfiguration('lantern');
	await config.update('hueIntegrationEnabled', false, vscode.ConfigurationTarget.Global);
	vscode.window.showInformationMessage('Philips Hue integration disabled.');
}

// This method is called when your extension is deactivated
export function deactivate() {}
