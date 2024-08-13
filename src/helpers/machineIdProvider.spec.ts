import { MachineIdProvider } from '@ecoflow/helpers/machineIdProvider';
import { Logging } from 'homebridge';
import { machineId } from 'node-machine-id';
import { v4 as uuidv4 } from 'uuid';

jest.mock('node-machine-id');
jest.mock('uuid');

describe('MachineIdProvider', () => {
  let provider: MachineIdProvider;
  let logMock: jest.Mocked<Logging>;
  const machineIdMock: jest.Mock = machineId as jest.Mock;
  const uuidV4Mock: jest.Mock = uuidv4 as jest.Mock;

  beforeEach(() => {
    machineIdMock.mockReset();
    uuidV4Mock.mockReset();
    logMock = {
      warn: jest.fn(),
    } as unknown as jest.Mocked<Logging>;
    provider = new MachineIdProvider(logMock);
  });

  describe('getMachineId', () => {
    it('should return valid machineId when there are no issues', async () => {
      machineIdMock.mockResolvedValueOnce('test machine id');

      const actual = await provider.getMachineId();

      expect(actual).toEqual('test machine id');
    });

    it('should return UUID when it is not possible to get machineId', async () => {
      machineIdMock.mockImplementation(() => {
        throw new Error('Permissions Denied');
      });
      uuidV4Mock.mockResolvedValueOnce('00000000-0000-0000-0000-000000000001');

      const actual = await provider.getMachineId();

      expect(actual).toEqual('00000000-0000-0000-0000-000000000001');
    });

    it('should log error when it is not possible to get machineId', async () => {
      const error = new Error('Permissions Denied');
      machineIdMock.mockImplementation(() => {
        throw error;
      });

      await provider.getMachineId();

      expect(logMock.warn).toHaveBeenCalledWith('Can not get Machine ID. Using UUID instead', error);
    });
  });
});
