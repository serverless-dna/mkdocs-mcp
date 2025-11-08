import {
  LogFormatter,
  Logger as PowertoolsLogger,
  LogItem
} from '@aws-lambda-powertools/logger';
import type {
  LogAttributes,
  UnformattedAttributes,
} from '@aws-lambda-powertools/logger/types';

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

// Override console methods to write to stderr
console.log = (...args: any[]) => process.stderr.write(args.join(' ') + '\n');
console.info = (...args: any[]) => process.stderr.write(args.join(' ') + '\n');
console.warn = (...args: any[]) => process.stderr.write(args.join(' ') + '\n');
console.debug = (...args: any[]) => process.stderr.write(args.join(' ') + '\n');

class CustomLogFormatter extends LogFormatter {
  formatAttributes(
    attributes: UnformattedAttributes,
    additionalLogAttributes: LogAttributes
  ): LogItem {
    return new LogItem({
      attributes: {
        timestamp: attributes.timestamp,
        level: attributes.level,
        message: attributes.message,
      },
    }).addAttributes(additionalLogAttributes);
  }
}

// Create logger with stderr output
const logger = new PowertoolsLogger({
  logLevel: (process.env.LOG_LEVEL as any) || 'INFO',
  serviceName: 'mkdocs-mcp',
  logFormatter: new CustomLogFormatter(),
});

// Restore original console methods for other parts of the application
console.log = originalConsole.log;
console.info = originalConsole.info;
console.warn = originalConsole.warn;
console.error = originalConsole.error;
console.debug = originalConsole.debug;

export { logger };
