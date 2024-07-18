import { Logging, LogLevel } from 'homebridge';

export class Logger {
  private constructor(private readonly logger: Logging, private readonly deviceName: string) {}

  public static create(logger: Logging, deviceName: string): Logging {
    return new Logger(logger, deviceName) as unknown as Logging;
  }

  public get prefix(): string {
    return this.logger.prefix;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public info(message: string, ...parameters: any[]): void {
    this.logger.info(this.wrapMessage(message), parameters);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public success(message: string, ...parameters: any[]): void {
    this.logger.success(this.wrapMessage(message), parameters);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public warn(message: string, ...parameters: any[]): void {
    this.logger.warn(this.wrapMessage(message), parameters);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public error(message: string, ...parameters: any[]): void {
    this.logger.error(this.wrapMessage(message), parameters);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public debug(message: string, ...parameters: any[]): void {
    this.logger.debug(this.wrapMessage(message), parameters);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public log(level: LogLevel, message: string, ...parameters: any[]): void {
    this.logger.log(level, this.wrapMessage(message), parameters);
  }

  private wrapMessage(message: string): string {
    return `[${this.deviceName}] ${message}`;
  }
}
