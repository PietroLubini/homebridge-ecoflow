import { DeviceInfo } from '@ecoflow/apis/containers/deviceInfo';
import { DeviceModel, LocationType } from '@ecoflow/config';
import { Logging } from 'homebridge';

describe('DeviceInfo', () => {
  let device: DeviceInfo;

  describe('connectionKey', () => {
    it('should initialize connectionKey when creating device info', () => {
      device = new DeviceInfo(
        {
          name: 'name1',
          accessKey: 'accessKey1',
          model: DeviceModel.Delta2,
          location: LocationType.US,
          secretKey: 'secretKey1',
          serialNumber: 'sn1',
        },
        {} as jest.Mocked<Logging>
      );
      const actual = device.connectionKey;

      expect(actual).toEqual('accessKey1_secretKey1');
    });
  });

  describe('accessKey', () => {
    it('should initialize accessKey when creating device info', () => {
      device = new DeviceInfo(
        {
          name: 'name1',
          accessKey: 'accessKey1',
          model: DeviceModel.Delta2,
          location: LocationType.US,
          secretKey: 'secretKey1',
          serialNumber: 'sn1',
        },
        {} as jest.Mocked<Logging>
      );
      const actual = device.accessKey;

      expect(actual).toEqual('accessKey1');
    });
  });
});
