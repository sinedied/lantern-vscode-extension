import { window, OutputChannel } from 'vscode';

class Logger {
  private outputChannel: OutputChannel;

  constructor() {
    this.outputChannel = window.createOutputChannel('Lantern');
  }

  log(message: string): void {
    this.outputChannel.appendLine(`[INFO] ${new Date().toISOString()}: ${message}`);
  }

  error(message: string, error?: unknown): void {
    const errorMessage = error ? `: ${error}` : '';
    this.outputChannel.appendLine(`[ERROR] ${new Date().toISOString()}: ${message}${errorMessage}`);
  }

  warn(message: string): void {
    this.outputChannel.appendLine(`[WARN] ${new Date().toISOString()}: ${message}`);
  }

  info(message: string): void {
    this.outputChannel.appendLine(`[INFO] ${new Date().toISOString()}: ${message}`);
  }

  show(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

export const logger = new Logger();
