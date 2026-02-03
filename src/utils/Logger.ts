/**
 * Logging utility for LENS-EXEC
 * Provides structured logging with different levels and component identification
 */
export class Logger {
  private component: string;
  private debugMode: boolean;

  constructor(component: string, debugMode = false) {
    this.component = component;
    this.debugMode = debugMode || process.env.NODE_ENV === 'development';
  }

  private formatMessage(level: string, message: string, ..._args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.component}]`;
    return `${prefix} ${message}`;
  }

  info(message: string, ...args: any[]): void {
    console.info(this.formatMessage('INFO', message), ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('WARN', message), ...args);
  }

  error(message: string, error?: any, ...args: any[]): void {
    console.error(this.formatMessage('ERROR', message), error, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (this.debugMode) {
      console.debug(this.formatMessage('DEBUG', message), ...args);
    }
  }

  trace(message: string, ...args: any[]): void {
    if (this.debugMode) {
      console.trace(this.formatMessage('TRACE', message), ...args);
    }
  }
}