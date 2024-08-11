import { Logger } from '@ecoflow/helpers/logger';
import { Logging, LogLevel } from 'homebridge';

describe('Logger', () => {
  let logger: Logging;
  let logMock: jest.Mocked<Logging>;

  beforeEach(() => {
    logMock = {
      debug: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      prefix: 'origin prefix',
    } as unknown as jest.Mocked<Logging>;
    logger = Logger.create(logMock, 'Device1');
  });

  describe('prefix', () => {
    it('should return origin prefix when is requested', () => {
      const actual = logger.prefix;

      expect(actual).toEqual('origin prefix');
    });
  });

  describe('info', () => {
    it('should add device name as prefix and call origin method when is called', () => {
      logger.info('message1', { param1: 'value1' });

      expect(logMock.info).toHaveBeenCalledWith('[Device1] message1', { param1: 'value1' });
    });
  });

  describe('success', () => {
    it('should add device name as prefix and call origin method when is called', () => {
      logger.success('message1', { param1: 'value1' });

      expect(logMock.success).toHaveBeenCalledWith('[Device1] message1', { param1: 'value1' });
    });
  });

  describe('warn', () => {
    it('should add device name as prefix and call origin method when is called', () => {
      logger.warn('message1', { param1: 'value1' });

      expect(logMock.warn).toHaveBeenCalledWith('[Device1] message1', { param1: 'value1' });
    });
  });

  describe('error', () => {
    it('should add device name as prefix and call origin method when is called', () => {
      logger.error('message1', { param1: 'value1' });

      expect(logMock.error).toHaveBeenCalledWith('[Device1] message1', { param1: 'value1' });
    });
  });

  describe('debug', () => {
    it('should add device name as prefix and call origin method when is called', () => {
      logger.debug('message1', { param1: 'value1' });

      expect(logMock.debug).toHaveBeenCalledWith('[Device1] message1', { param1: 'value1' });
    });
  });

  describe('log', () => {
    it('should add device name as prefix and call origin method when is called', () => {
      logger.log(LogLevel.WARN, 'message1', { param1: 'value1' });

      expect(logMock.log).toHaveBeenCalledWith(LogLevel.WARN, '[Device1] message1', { param1: 'value1' });
    });
  });
});
