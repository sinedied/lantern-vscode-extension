import * as vscode from 'vscode';
import { RgbColor } from './colors';
import { getHueIntensity } from './config';
import { logger } from './logger';

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

interface HueLightResponse {
  name: string;
  state: {
    on: boolean;
    xy?: [number, number];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isHueLightResponse(value: unknown): value is HueLightResponse {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    !isRecord(value.state) ||
    typeof value.state.on !== 'boolean'
  ) {
    return false;
  }
  const xy = value.state.xy;
  return (
    xy === undefined ||
    (Array.isArray(xy) &&
      xy.length === 2 &&
      xy.every((coordinate: unknown) => typeof coordinate === 'number' && Number.isFinite(coordinate)))
  );
}

export class Hue {
  private bridge: HueBridge | undefined;

  constructor() {
    this.loadBridgeConfig();
  }

  // Make an HTTP request with timeout support
  private async makeRequest(
    url: string,
    options: RequestInit & { timeout?: number } = {},
  ): Promise<{ data: unknown; status: number }> {
    const { timeout = 5000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data: unknown = await response.json();
      return { data, status: response.status };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
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

  async discoverBridges(): Promise<HueBridge[]> {
    try {
      const response = await this.makeRequest('https://discovery.meethue.com/', { timeout: 5000 });
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid Hue bridge discovery response');
      }
      return response.data.map((bridge: unknown) => {
        if (!isRecord(bridge) || typeof bridge.internalipaddress !== 'string') {
          throw new Error('Invalid Hue bridge discovery response');
        }
        return { ip: bridge.internalipaddress };
      });
    } catch (error) {
      logger.error('Failed to discover Hue bridges', error);
      return [];
    }
  }

  async createUser(bridgeIp: string): Promise<string | undefined> {
    try {
      const response = await this.makeRequest(`http://${bridgeIp}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devicetype: 'VSCode_Lantern#Extension' }),
        timeout: 120000,
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid Hue user response');
      }
      const result: unknown = response.data[0];
      if (!isRecord(result)) {
        throw new Error('Invalid Hue user response');
      }
      if (isRecord(result.success) && typeof result.success.username === 'string') {
        const username = result.success.username;
        await this.saveBridgeConfig({ ip: bridgeIp, username });
        logger.log(`Created Hue user`);

        return username;
      } else if (isRecord(result.error) && typeof result.error.description === 'string') {
        throw new Error(result.error.description);
      }
      throw new Error('Invalid Hue user response');
    } catch (error) {
      logger.error('Failed to create Hue user', error);
      throw error;
    }
  }

  async getLights(): Promise<HueLight[]> {
    if (!this.bridge?.username) {
      throw new Error('Hue bridge not configured');
    }

    try {
      const response = await this.makeRequest(`http://${this.bridge.ip}/api/${this.bridge.username}/lights`, {
        timeout: 5000,
      });
      if (!isRecord(response.data)) {
        throw new Error('Invalid Hue lights response');
      }

      const lights: HueLight[] = [];
      for (const [id, lightData] of Object.entries(response.data)) {
        if (!isHueLightResponse(lightData)) {
          throw new Error(`Invalid Hue light response for light ${id}`);
        }
        lights.push({
          id,
          name: lightData.name,
          on: lightData.state.on,
          xy: lightData.state.xy,
        });
      }

      return lights;
    } catch (error) {
      logger.error('Failed to get Hue lights', error);
      throw error;
    }
  }

  async setLightColor(lightIds: string[], color: RgbColor): Promise<void> {
    if (!this.bridge?.username) {
      throw new Error('Hue bridge not configured');
    }

    const xy = this.rgbToXy(color);
    const intensity = getHueIntensity();
    // Convert 0-100 range to 0-254 range for Hue API (0 = off, 1-254 = brightness)
    const hueBrightness = intensity === 0 ? 0 : Math.round((intensity / 100) * 254);

    logger.log(`Updating color for lights ${lightIds.join(', ')}`);
    const promises = lightIds.map(async (lightId) => {
      try {
        await this.makeRequest(`http://${this.bridge!.ip}/api/${this.bridge!.username}/lights/${lightId}/state`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            on: hueBrightness > 0,
            xy: xy,
            bri: hueBrightness > 0 ? hueBrightness : 1, // Minimum brightness when on
            transitiontime: 4, // 0.4 seconds transition
          }),
          timeout: 5000,
        });
      } catch (error) {
        logger.error(`Failed to set color for light ${lightId}`, error);
      }
    });

    await Promise.all(promises);
  }

  async turnOffLights(lightIds: string[]): Promise<void> {
    if (!this.bridge?.username) {
      throw new Error('Hue bridge not configured');
    }

    logger.log(`Turning off lights: ${lightIds.join(', ')}`);
    const promises = lightIds.map(async (lightId) => {
      try {
        await this.makeRequest(`http://${this.bridge!.ip}/api/${this.bridge!.username}/lights/${lightId}/state`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            on: false,
            transitiontime: 4, // 0.4 seconds transition
          }),
          timeout: 5000,
        });
      } catch (error) {
        logger.error(`Failed to turn off light ${lightId}`, error);
      }
    });

    await Promise.all(promises);
  }

  // Convert RGB to XY color space (Philips Hue format)
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
    const Z = rGamma * 0.0 + gGamma * 0.053077 + bGamma * 1.035763;

    // Convert to xy
    const sum = X + Y + Z;
    if (sum === 0) {
      return [0.3127, 0.329]; // Default white point
    }

    const x = X / sum;
    const y = Y / sum;

    // Ensure values are within gamut
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    return [clampedX, clampedY];
  }

  async testConnection(): Promise<boolean> {
    if (!this.bridge?.username) {
      return false;
    }

    try {
      const response = await this.makeRequest(`http://${this.bridge.ip}/api/${this.bridge.username}/config`, {
        timeout: 5000,
      });

      if (Array.isArray(response.data) && isRecord(response.data[0]) && isRecord(response.data[0].error)) {
        return false;
      }
      if (!isRecord(response.data)) {
        throw new Error('Invalid Hue configuration response');
      }
      return response.status === 200;
    } catch (error) {
      logger.error('Hue connection test failed', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return !!(this.bridge?.ip && this.bridge?.username);
  }

  isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('lantern');
    return config.get<boolean>('hueEnabled', false);
  }
}
