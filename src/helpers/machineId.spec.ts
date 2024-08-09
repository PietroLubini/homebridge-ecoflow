import { MachineIdProvider } from '@ecoflow/helpers/machineId';
import { Logging } from 'homebridge';
import { machineId } from 'node-machine-id';
import { v4 as uuidV4 } from 'uuid';

jest.mock('node-machine-id', () => {
  return {
    machineId: jest.fn(),
  };
});

jest.mock('uuid', () => {
  return {
    v4: jest.fn(),
  };
});

describe('EcoFlowMqttApi', () => {
  let provider: MachineIdProvider;
  let logMock: Logging;

  beforeEach(() => {
    logMock = {
      warn: jest.fn(),
    } as unknown as Logging;
    provider = new MachineIdProvider(logMock);
  });

  describe('getMachineId', () => {
    it('should return valid machineId when there are no issues', async () => {
      (machineId as jest.Mock).mockResolvedValueOnce('test machine id');

      const actual = await provider.getMachineId();

      expect(actual).toEqual('test machine id');
    });

    it('should return UUID when it is not possible to get machineId', async () => {
      (machineId as jest.Mock).mockImplementation(() => {
        throw new Error('Permissions Denied');
      });
      (uuidV4 as jest.Mock).mockResolvedValueOnce('00000000-0000-0000-0000-000000000001');

      const actual = await provider.getMachineId();

      expect(actual).toEqual('00000000-0000-0000-0000-000000000001');
    });

    it('should log error when it is not possible to get machineId', async () => {
      const error = new Error('Permissions Denied');
      (machineId as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await provider.getMachineId();

      expect(logMock.warn).toHaveBeenCalledWith('Can not get Machine ID. Using UUID instead', error);
    });
  });
});
