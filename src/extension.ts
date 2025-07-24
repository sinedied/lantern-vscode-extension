// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ColorService } from './color-service';
import { PhilipsHueService } from './hue-service';
import { hexToRgb } from './color-utils';

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

	// Listen for window state changes to update Hue lights when window becomes active
	const windowStateDisposable = vscode.window.onDidChangeWindowState(async (windowState) => {
		if (windowState.focused) {
			// Window became active, update Hue lights if integration is enabled
			await updateHueLightsOnWindowFocus();
		}
	});

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
		resetColorsDisposable,
		windowStateDisposable
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

		// Get previously selected light IDs to pre-select them
		const lightConfig = vscode.workspace.getConfiguration('lantern');
		const previouslySelectedIds = lightConfig.get<string[]>('hueLightIds', []);

		const lightOptions = lights.map(light => ({
			label: light.name,
			description: `ID: ${light.id}`,
			picked: previouslySelectedIds.includes(light.id),
			lightId: light.id
		}));

		const placeholderText = previouslySelectedIds.length > 0 
			? 'Select which lights to control (previously selected lights are pre-selected)'
			: 'Select which lights to control (you can select multiple)';

		const selectedLights = await vscode.window.showQuickPick(lightOptions, {
			placeHolder: placeholderText,
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

		// Apply current workspace color to the selected lights
		await applyCurrentColorToHueLights();

	} catch (error: any) {
		vscode.window.showErrorMessage(`Failed to get Hue lights: ${error.message}`);
	}
}

async function disableHueIntegration(): Promise<void> {
	try {
		const config = vscode.workspace.getConfiguration('lantern');
		
		// Get the selected lights and turn them off before disabling integration
		const lightIds = config.get<string[]>('hueLightIds', []);
		
		if (lightIds.length > 0) {
			const hueService = colorService.getHueService();
			
			if (hueService.isConfigured()) {
				try {
					await hueService.turnOffLights(lightIds);
					vscode.window.showInformationMessage('Turned off Hue lights and disabled integration.');
				} catch (error) {
					console.error('Failed to turn off lights during disable:', error);
					vscode.window.showWarningMessage('Disabled Hue integration but failed to turn off lights.');
				}
			} else {
				vscode.window.showInformationMessage('Philips Hue integration disabled.');
			}
		} else {
			vscode.window.showInformationMessage('Philips Hue integration disabled.');
		}
		
		// Disable the integration
		await config.update('hueIntegrationEnabled', false, vscode.ConfigurationTarget.Global);
		
	} catch (error: any) {
		vscode.window.showErrorMessage(`Failed to disable Hue integration: ${error.message}`);
	}
}

async function applyCurrentColorToHueLights(): Promise<void> {
	try {
		// Check if there's a current workspace color to apply
		const workbenchConfig = vscode.workspace.getConfiguration('workbench');
		const colorCustomizations = workbenchConfig.get<any>('colorCustomizations', {});
		
		const config = vscode.workspace.getConfiguration('lantern');
		const targetElement = config.get<string>('targetElement', 'statusBar');
		
		// Get the current color for the target element
		let currentColor: string | undefined;
		switch (targetElement) {
			case 'statusBar':
				currentColor = colorCustomizations['statusBar.background'];
				break;
			case 'titleBar':
				currentColor = colorCustomizations['titleBar.activeBackground'];
				break;
			case 'activityBar':
				currentColor = colorCustomizations['activityBar.background'];
				break;
		}

		if (!currentColor) {
			// No current color set, nothing to apply
			return;
		}

		// Convert hex color to RGB
		const rgbColor = hexToRgb(currentColor);

		// Apply color to Hue lights
		const hueService = colorService.getHueService();
		const lightIds = config.get<string[]>('hueLightIds', []);
		
		if (lightIds.length > 0) {
			await hueService.setLightColor(lightIds, rgbColor);
			vscode.window.showInformationMessage(`Applied current workspace color ${currentColor} to Hue lights.`);
		}
	} catch (error: any) {
		console.error('Failed to apply current color to Hue lights:', error);
		vscode.window.showWarningMessage('Failed to apply current color to Hue lights.');
	}
}

async function updateHueLightsOnWindowFocus(): Promise<void> {
	try {
		// Check if Hue integration is enabled
		const config = vscode.workspace.getConfiguration('lantern');
		const hueEnabled = config.get<boolean>('hueIntegrationEnabled', false);
		
		if (!hueEnabled) {
			return; // Hue integration is disabled
		}

		const hueService = colorService.getHueService();
		if (!hueService.isConfigured()) {
			return; // Hue not configured
		}

		// Check if there are lights configured
		const lightIds = config.get<string[]>('hueLightIds', []);
		if (lightIds.length === 0) {
			return; // No lights configured
		}

		// Get the current workspace color
		const workbenchConfig = vscode.workspace.getConfiguration('workbench');
		const colorCustomizations = workbenchConfig.get<any>('colorCustomizations', {});
		
		const targetElement = config.get<string>('targetElement', 'statusBar');
		
		// Get the current color for the target element
		let currentColor: string | undefined;
		switch (targetElement) {
			case 'statusBar':
				currentColor = colorCustomizations['statusBar.background'];
				break;
			case 'titleBar':
				currentColor = colorCustomizations['titleBar.activeBackground'];
				break;
			case 'activityBar':
				currentColor = colorCustomizations['activityBar.background'];
				break;
		}

		// If no current workspace color, use the default color
		if (!currentColor) {
			currentColor = config.get<string>('hueDefaultColor', '#000000');
		}

		// Check if we should turn off the lights (default color is #000000)
		if (currentColor === '#000000') {
			await hueService.turnOffLights(lightIds);
		} else {
			// Convert hex color to RGB and apply to lights
			const rgbColor = hexToRgb(currentColor);
			await hueService.setLightColor(lightIds, rgbColor);
		}
		
		// Optional: Show a subtle notification (commented out to avoid spam)
		// vscode.window.showInformationMessage(`Updated Hue lights to ${currentColor === '#000000' ? 'off' : `color ${currentColor}`}`);
		
	} catch (error: any) {
		console.error('Failed to update Hue lights on window focus:', error);
		// Don't show error messages to user to avoid spam, just log
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
