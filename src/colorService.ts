import * as vscode from 'vscode';
import { RgbColor, generateRandomColorVariant, getCurrentThemeColor, rgbToHex } from './colorUtils';
import { PhilipsHueService } from './hueService';

export class ColorService {
    private hueService: PhilipsHueService;
    private currentWorkspacePath: string | null = null;

    constructor() {
        this.hueService = new PhilipsHueService();
        this.updateCurrentWorkspacePath();
        
        // Listen for workspace changes
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.updateCurrentWorkspacePath();
            this.applyStoredColors();
        });
    }

    private updateCurrentWorkspacePath(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        this.currentWorkspacePath = workspaceFolders && workspaceFolders.length > 0 
            ? workspaceFolders[0].uri.fsPath 
            : null;
    }

    /**
     * Apply stored colors for the current workspace
     */
    async applyStoredColors(): Promise<void> {
        if (!this.currentWorkspacePath) {
            return;
        }

        const config = vscode.workspace.getConfiguration('lantern');
        const targetElement = config.get<string>('targetElement', 'statusBar');
        
        // Check workspace settings first
        const workspaceSettings = this.getWorkspaceSettings();
        if (workspaceSettings && this.hasColorSettings(workspaceSettings)) {
            await this.applyColor(workspaceSettings, targetElement);
            return;
        }

        // Check global settings
        const globalSettings = this.getGlobalSettings();
        if (globalSettings && this.hasColorSettings(globalSettings)) {
            await this.applyColor(globalSettings, targetElement);
        }
    }

    /**
     * Assign a unique color to the current workspace
     */
    async assignUniqueColor(): Promise<void> {
        if (!this.currentWorkspacePath) {
            vscode.window.showErrorMessage('No workspace is currently open.');
            return;
        }

        const config = vscode.workspace.getConfiguration('lantern');
        const targetElement = config.get<string>('targetElement', 'statusBar');

        // Get current theme color for the target element
        const baseColor = getCurrentThemeColor(targetElement);
        
        // Generate a random color variant
        const newColor = generateRandomColorVariant(baseColor);
        const hexColor = rgbToHex(newColor);

        // Ask user where to save the settings
        const saveLocation = await vscode.window.showQuickPick([
            { label: 'Global settings (default)', value: 'global' },
            { label: 'Workspace settings', value: 'workspace' }
        ], {
            placeHolder: 'Where would you like to save the color settings?'
        });

        if (!saveLocation) {
            return;
        }

        // Create color settings
        const colorSettings = this.createColorSettings(targetElement, hexColor);

        // Save settings
        if (saveLocation.value === 'workspace') {
            await this.saveToWorkspaceSettings(colorSettings);
        } else {
            await this.saveToGlobalSettings(colorSettings);
        }

        // Apply the color
        await this.applyColor(colorSettings, targetElement);

        // Update Hue lights if enabled
        if (this.hueService.isEnabled() && this.hueService.isConfigured()) {
            await this.updateHueLights(newColor);
        }

        vscode.window.showInformationMessage(
            `Lantern: Assigned color ${hexColor} to ${targetElement}. Settings saved to ${saveLocation.label.toLowerCase()}.`
        );
    }

    /**
     * Reset colors for the current workspace
     */
    async resetColors(): Promise<void> {
        if (!this.currentWorkspacePath) {
            vscode.window.showErrorMessage('No workspace is currently open.');
            return;
        }

        // Remove from workspace settings
        const workbenchConfig = vscode.workspace.getConfiguration('workbench');
        const colorCustomizations = workbenchConfig.get<any>('colorCustomizations', {});
        
        const colorKeys = ['statusBar.background', 'titleBar.activeBackground', 'activityBar.background'];
        let hasChanges = false;

        for (const key of colorKeys) {
            if (colorCustomizations[key]) {
                delete colorCustomizations[key];
                hasChanges = true;
            }
        }

        if (hasChanges) {
            await workbenchConfig.update('colorCustomizations', colorCustomizations, vscode.ConfigurationTarget.Workspace);
        }

        // Remove from global settings
        const config = vscode.workspace.getConfiguration('lantern');
        const globalSettings = config.get<any>('workspaceColors', {});
        
        if (globalSettings[this.currentWorkspacePath]) {
            delete globalSettings[this.currentWorkspacePath];
            await config.update('workspaceColors', globalSettings, vscode.ConfigurationTarget.Global);
        }

        // Remove workspace-specific settings
        const workspaceConfig = vscode.workspace.getConfiguration('lantern');
        const configKeys = ['statusBarBackground', 'titleBarActiveBackground', 'activityBarBackground'];
        for (const key of configKeys) {
            const inspect = workspaceConfig.inspect(key);
            if (inspect?.workspaceValue) {
                await workspaceConfig.update(key, undefined, vscode.ConfigurationTarget.Workspace);
            }
        }

        vscode.window.showInformationMessage('Lantern: Colors reset for this workspace.');
    }

    private createColorSettings(targetElement: string, hexColor: string): any {
        const colorKeys: { [key: string]: string } = {
            'statusBar': 'statusBar.background',
            'titleBar': 'titleBar.activeBackground',
            'activityBar': 'activityBar.background'
        };

        return {
            [colorKeys[targetElement]]: hexColor
        };
    }

    private getWorkspaceSettings(): any {
        const config = vscode.workspace.getConfiguration('lantern');
        // For workspace settings, we'll read the individual color properties
        const statusBarBg = config.get<string>('statusBarBackground');
        const titleBarBg = config.get<string>('titleBarActiveBackground');
        const activityBarBg = config.get<string>('activityBarBackground');
        
        const settings: any = {};
        if (statusBarBg) {
            settings['statusBar.background'] = statusBarBg;
        }
        if (titleBarBg) {
            settings['titleBar.activeBackground'] = titleBarBg;
        }
        if (activityBarBg) {
            settings['activityBar.background'] = activityBarBg;
        }
        
        return Object.keys(settings).length > 0 ? settings : null;
    }

    private getGlobalSettings(): any {
        if (!this.currentWorkspacePath) {
            return null;
        }

        const config = vscode.workspace.getConfiguration('lantern');
        const globalSettings = config.get<any>('workspaceColors', {});
        return globalSettings[this.currentWorkspacePath];
    }

    private hasColorSettings(settings: any): boolean {
        if (!settings) {
            return false;
        }

        const colorKeys = ['statusBar.background', 'titleBar.activeBackground', 'activityBar.background'];
        return colorKeys.some(key => settings[key]);
    }

    private async saveToWorkspaceSettings(colorSettings: any): Promise<void> {
        const config = vscode.workspace.getConfiguration('lantern');
        // For workspace settings, we store each color property individually
        for (const [key, value] of Object.entries(colorSettings)) {
            let configKey: string;
            switch (key) {
                case 'statusBar.background':
                    configKey = 'statusBarBackground';
                    break;
                case 'titleBar.activeBackground':
                    configKey = 'titleBarActiveBackground';
                    break;
                case 'activityBar.background':
                    configKey = 'activityBarBackground';
                    break;
                default:
                    continue; // Skip unknown keys
            }
            await config.update(configKey, value, vscode.ConfigurationTarget.Workspace);
        }
    }

    private async saveToGlobalSettings(colorSettings: any): Promise<void> {
        if (!this.currentWorkspacePath) {
            return;
        }

        const config = vscode.workspace.getConfiguration('lantern');
        const globalSettings = config.get<any>('workspaceColors', {});
        
        if (!globalSettings[this.currentWorkspacePath]) {
            globalSettings[this.currentWorkspacePath] = {};
        }

        Object.assign(globalSettings[this.currentWorkspacePath], colorSettings);
        await config.update('workspaceColors', globalSettings, vscode.ConfigurationTarget.Global);
    }

    private async applyColor(colorSettings: any, targetElement: string): Promise<void> {
        const workbenchConfig = vscode.workspace.getConfiguration('workbench');
        const currentCustomizations = workbenchConfig.get<any>('colorCustomizations', {});
        
        // Merge the color settings
        const updatedCustomizations = { ...currentCustomizations, ...colorSettings };
        
        await workbenchConfig.update(
            'colorCustomizations', 
            updatedCustomizations, 
            vscode.ConfigurationTarget.Workspace
        );
    }

    private async updateHueLights(color: RgbColor): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('lantern');
            const lightIds = config.get<string[]>('hueLightIds', []);
            
            if (lightIds.length > 0) {
                await this.hueService.setLightColor(lightIds, color);
            }
        } catch (error) {
            console.error('Failed to update Hue lights:', error);
            vscode.window.showWarningMessage('Failed to update Philips Hue lights.');
        }
    }

    /**
     * Get the Hue service instance
     */
    getHueService(): PhilipsHueService {
        return this.hueService;
    }
}
