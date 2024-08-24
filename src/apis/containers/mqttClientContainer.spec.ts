import { MqttClientContainer } from '@ecoflow/apis/containers/mqttClientContainer';
import { MqttDevice } from '@ecoflow/apis/containers/mqttDevice';
import { DeviceInfoConfig } from '@ecoflow/config';
import { Logging } from 'homebridge';
import mqtt from 'mqtt';

describe('MqttClient', () => {
  let mqttClient: MqttClientContainer;

  beforeEach(() => {
    mqttClient = new MqttClientContainer({
      certificateAccount: 'account',
      certificatePassword: 'pwd',
      url: 'url1',
      port: '8085',
      protocol: 'mqtts',
    });
  });

  describe('client', () => {
    let clientMock: jest.Mocked<mqtt.MqttClient>;

    beforeEach(() => {
      clientMock = {} as jest.Mocked<mqtt.MqttClient>;
    });

    it('should get null as client when is not set yet', () => {
      const actual = mqttClient.client;

      expect(actual).toBeNull();
    });

    it('should set client property when is not set yet', () => {
      mqttClient.client = clientMock;
      const actual = mqttClient.client;

      expect(actual).toBe(clientMock);
    });

    it('should not set client property when it is already set', () => {
      mqttClient.client = clientMock;
      mqttClient.client = {} as jest.Mocked<mqtt.MqttClient>;
      const actual = mqttClient.client;

      expect(actual).toBe(clientMock);
    });
  });

  describe('isConnected', () => {
    let clientMock: jest.Mocked<mqtt.MqttClient>;

    beforeEach(() => {
      clientMock = {} as jest.Mocked<mqtt.MqttClient>;
    });

    it('should return false when mqtt is not connected', () => {
      const actual = mqttClient.isConnected();

      expect(actual).toBeFalsy();
    });

    it('should return true when mqtt is connected', () => {
      mqttClient.client = clientMock;
      const actual = mqttClient.isConnected();

      expect(actual).toBeTruthy();
    });
  });

  describe('devices', () => {
    let log1Mock: jest.Mocked<Logging>;
    let log2Mock: jest.Mocked<Logging>;
    let log3Mock: jest.Mocked<Logging>;
    let config1: DeviceInfoConfig;
    let config2: DeviceInfoConfig;
    let config3: DeviceInfoConfig;

    beforeEach(() => {
      log1Mock = {} as jest.Mocked<Logging>;
      log2Mock = {} as jest.Mocked<Logging>;
      log3Mock = {} as jest.Mocked<Logging>;
      config1 = { name: 'name1', serialNumber: 'sn1' };
      config2 = { name: 'name2', serialNumber: 'sn2' };
      config3 = { name: 'name3', serialNumber: 'sn3' };
    });

    describe('addDevice', () => {
      it('should add device to cache when there is no devices for serial number yet', () => {
        const expected = [new MqttDevice(config1, log1Mock)];

        mqttClient.addDevice(config1, log1Mock);
        const actual = mqttClient.getAllDevices();

        expect(actual).toEqual(expected);
      });

      it('should add device to cache when there is already device for serial number', () => {
        config2.serialNumber = 'sn1';
        const expected = [new MqttDevice(config1, log1Mock), new MqttDevice(config2, log2Mock)];

        mqttClient.addDevice(config1, log1Mock);
        mqttClient.addDevice(config2, log2Mock);
        const actual = mqttClient.getAllDevices();

        expect(actual).toEqual(expected);
      });
    });

    describe('getDevices', () => {
      it('should return list of devices for serial number when there is any in cache', () => {
        config2.serialNumber = 'sn1';
        const expected = [new MqttDevice(config1, log1Mock), new MqttDevice(config2, log2Mock)];

        mqttClient.addDevice(config1, log1Mock);
        mqttClient.addDevice(config2, log2Mock);
        mqttClient.addDevice(config3, log3Mock);
        const actual = mqttClient.getDevices('sn1');

        expect(actual).toEqual(expected);
      });

      it('should return empty array when there is no device for serial number in cache', () => {
        const expected: MqttDevice[] = [];

        mqttClient.addDevice(config1, log1Mock);
        const actual = mqttClient.getDevices('sn2');

        expect(actual).toEqual(expected);
      });

      it('should return empty array when serial number is not defined', () => {
        const expected: MqttDevice[] = [];

        mqttClient.addDevice(config1, log1Mock);
        const actual = mqttClient.getDevices();

        expect(actual).toEqual(expected);
      });
    });

    describe('getAllDevices', () => {
      it('should return list of devices when there is any in cache', () => {
        const expected = [
          new MqttDevice(config1, log1Mock),
          new MqttDevice(config2, log2Mock),
          new MqttDevice(config3, log3Mock),
        ];

        mqttClient.addDevice(config1, log1Mock);
        mqttClient.addDevice(config2, log2Mock);
        mqttClient.addDevice(config3, log3Mock);
        const actual = mqttClient.getAllDevices();

        expect(actual).toEqual(expected);
      });

      it('should return empty array when serial number is not defined', () => {
        const expected: MqttDevice[] = [];

        const actual = mqttClient.getAllDevices();

        expect(actual).toEqual(expected);
      });
    });
  });
});
