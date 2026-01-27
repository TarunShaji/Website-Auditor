export class Logger {
  constructor(context = 'APP') {
    this.context = context;
    this.logs = [];
  }

  formatTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, data = null) {
    const timestamp = this.formatTimestamp();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      data
    };

    const formattedLog = data 
      ? `[${timestamp}] [${level}] [${this.context}] ${message} ${JSON.stringify(data)}`
      : `[${timestamp}] [${level}] [${this.context}] ${message}`;

    return { logEntry, formattedLog };
  }

  info(message, data = null) {
    const { logEntry, formattedLog } = this.formatMessage('INFO', message, data);
    console.log(formattedLog);
    this.logs.push(logEntry);
  }

  warn(message, data = null) {
    const { logEntry, formattedLog } = this.formatMessage('WARN', message, data);
    console.warn(formattedLog);
    this.logs.push(logEntry);
  }

  error(message, data = null) {
    const { logEntry, formattedLog } = this.formatMessage('ERROR', message, data);
    console.error(formattedLog);
    this.logs.push(logEntry);
  }

  debug(message, data = null) {
    const { logEntry, formattedLog } = this.formatMessage('DEBUG', message, data);
    console.log(formattedLog);
    this.logs.push(logEntry);
  }

  success(message, data = null) {
    const { logEntry, formattedLog } = this.formatMessage('SUCCESS', message, data);
    console.log(formattedLog);
    this.logs.push(logEntry);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}
