type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class SimpleLogger {
  private logLevel: LogLevel;
  private serviceName: string;

  constructor(serviceName: string = 'mkdocs-mcp', logLevel: LogLevel = 'INFO') {
    this.serviceName = serviceName;
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${this.serviceName}: ${message}${metaStr}`;
  }

  private writeToStderr(message: string): void {
    process.stderr.write(message + '\n');
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog('DEBUG')) {
      this.writeToStderr(this.formatMessage('DEBUG', message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('INFO')) {
      this.writeToStderr(this.formatMessage('INFO', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('WARN')) {
      this.writeToStderr(this.formatMessage('WARN', message, meta));
    }
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog('ERROR')) {
      this.writeToStderr(this.formatMessage('ERROR', message, meta));
    }
  }
}

export const logger = new SimpleLogger();
