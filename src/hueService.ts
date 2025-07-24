import axios from 'axios';
import * as vscode from 'vscode';
import { RgbColor, rgbToOklch, oklchToRgb } from './colorUtils';

export interface HueBridge {
    ip: string;
    username?: string;
}

export interface HueLight {
    id: string;
    name: string;
    on: boolean;
    xy?: [number, number];
}

export class PhilipsHueService {
    private bridge: HueBridge | null = null;

    constructor() {
        this.loadBridgeConfig();
    }

    private loadBridgeConfig(): void {
        const config = vscode.workspace.getConfiguration('lantern');
        const ip = config.get<string>('hueBridgeIp');
        const username = config.get<string>('hueUsername');

        if (ip && username) {
            this.bridge = { ip, username };
        }
    }

    private async saveBridgeConfig(bridge: HueBridge): Promise<void> {
        const config = vscode.workspace.getConfiguration('lantern');
        await config.update('hueBridgeIp', bridge.ip, vscode.ConfigurationTarget.Global);
        if (bridge.username) {
            await config.update('hueUsername', bridge.username, vscode.ConfigurationTarget.Global);
        }
        this.bridge = bridge;
    }

    /**
     * Discover Philips Hue bridges on the network
     */
    async discoverBridges(): Promise<HueBridge[]> {
        try {
            const response = await axios.get('https://discovery.meethue.com/', { timeout: 5000 });
            return response.data.map((bridge: any) => ({ ip: bridge.internalipaddress }));
        } catch (error) {
            console.error('Failed to discover Hue bridges:', error);
            return [];
        }
    }

    /**
     * Create a new user on the Hue bridge
     */
    async createUser(bridgeIp: string): Promise<string | null> {
        try {
            const response = await axios.post(
                `http://${bridgeIp}/api`,
                { devicetype: 'VSCode_Lantern#Extension' },
                { timeout: 120000 }
            );

            const result = response.data[0];
            if (result.success) {
                const username = result.success.username;
                await this.saveBridgeConfig({ ip: bridgeIp, username });
                return username;
            } else if (result.error) {
                throw new Error(result.error.description);
            }
        } catch (error) {
            console.error('Failed to create Hue user:', error);
            throw error;
        }
        return null;
    }

    /**
     * Get all lights from the bridge
     */
    async getLights(): Promise<HueLight[]> {
        if (!this.bridge?.username) {
            throw new Error('Hue bridge not configured');
        }

        try {
            const response = await axios.get(
                `http://${this.bridge.ip}/api/${this.bridge.username}/lights`,
                { timeout: 5000 }
            );

            const lights: HueLight[] = [];
            for (const [id, lightData] of Object.entries(response.data)) {
                const light = lightData as any;
                lights.push({
                    id,
                    name: light.name,
                    on: light.state.on,
                    xy: light.state.xy
                });
            }

            return lights;
        } catch (error) {
            console.error('Failed to get Hue lights:', error);
            throw error;
        }
    }

    /**
     * Set the color of specified lights
     */
    async setLightColor(lightIds: string[], color: RgbColor): Promise<void> {
        if (!this.bridge?.username) {
            throw new Error('Hue bridge not configured');
        }

        const xy = this.rgbToXy(color);

        const promises = lightIds.map(async (lightId) => {
            try {
                await axios.put(
                    `http://${this.bridge!.ip}/api/${this.bridge!.username}/lights/${lightId}/state`,
                    {
                        on: true,
                        xy: xy,
                        bri: 254, // Maximum brightness
                        transitiontime: 4 // 0.4 seconds transition
                    },
                    { timeout: 5000 }
                );
            } catch (error) {
                console.error(`Failed to set color for light ${lightId}:`, error);
            }
        });

        await Promise.all(promises);
    }

    /**
     * Convert RGB to XY color space (Philips Hue format)
     */
    private rgbToXy(rgb: RgbColor): [number, number] {
        // Normalize RGB values
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;

        // Apply gamma correction
        const rGamma = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        const gGamma = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        const bGamma = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        // Convert to XYZ
        const X = rGamma * 0.649926 + gGamma * 0.103455 + bGamma * 0.197109;
        const Y = rGamma * 0.234327 + gGamma * 0.743075 + bGamma * 0.022598;
        const Z = rGamma * 0.0000000 + gGamma * 0.053077 + bGamma * 1.035763;

        // Convert to xy
        const sum = X + Y + Z;
        if (sum === 0) {
            return [0.3127, 0.3290]; // Default white point
        }

        const x = X / sum;
        const y = Y / sum;

        // Ensure values are within gamut
        const clampedX = Math.max(0, Math.min(1, x));
        const clampedY = Math.max(0, Math.min(1, y));

        return [clampedX, clampedY];
    }

    /**
     * Test the connection to the Hue bridge
     */
    async testConnection(): Promise<boolean> {
        if (!this.bridge?.username) {
            return false;
        }

        try {
            const response = await axios.get(
                `http://${this.bridge.ip}/api/${this.bridge.username}/config`,
                { timeout: 5000 }
            );

            return response.status === 200 && !response.data[0]?.error;
        } catch (error) {
            console.error('Hue connection test failed:', error);
            return false;
        }
    }

    /**
     * Check if Hue integration is configured and enabled
     */
    isConfigured(): boolean {
        return !!(this.bridge?.ip && this.bridge?.username);
    }

    /**
     * Check if Hue integration is enabled in settings
     */
    isEnabled(): boolean {
        const config = vscode.workspace.getConfiguration('lantern');
        return config.get<boolean>('hueIntegrationEnabled', false);
    }
}
