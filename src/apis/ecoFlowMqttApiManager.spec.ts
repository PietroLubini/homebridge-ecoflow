import { DeviceInfo } from '@ecoflow/apis/containers/deviceInfo';
import { MqttDevice } from '@ecoflow/apis/containers/mqttDevice';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { AcquireCertificateData } from '@ecoflow/apis/interfaces/httpApiContracts';
import {
  MqttMessage,
  MqttMessageType,
  MqttQuotaMessage,
  MqttSetReplyMessage,
  MqttTopicType,
} from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceAccessConfig, DeviceConfig, LocationType } from '@ecoflow/config';
import { MachineIdProvider } from '@ecoflow/helpers/machineIdProvider';
import { Logging } from 'homebridge';
import { connectAsync, IClientOptions, IPublishPacket, MqttClient, OnMessageCallback } from 'mqtt';
import { Subscription } from 'rxjs';

jest.mock('mqtt');
jest.mock('@ecoflow/apis/containers/mqttDevice');

describe('EcoFlowMqttApiManager', () => {
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let log1Mock: jest.Mocked<Logging>;
  let log2Mock: jest.Mocked<Logging>;
  let log3Mock: jest.Mocked<Logging>;
  let machineIdProviderMock: jest.Mocked<MachineIdProvider>;
  let client1Mock: jest.Mocked<MqttClient>;
  let client3Mock: jest.Mocked<MqttClient>;
  let manager: EcoFlowMqttApiManager;
  let config1: DeviceAccessConfig;
  let config2: DeviceAccessConfig;
  let config3: DeviceAccessConfig;
  let deviceInfo1: DeviceInfo;
  let deviceInfo2: DeviceInfo;
  let deviceInfo3: DeviceInfo;
  let mqttDevice1Mock: jest.Mocked<MqttDevice>;
  let mqttDevice2Mock: jest.Mocked<MqttDevice>;
  let mqttDevice3Mock: jest.Mocked<MqttDevice>;
  let subscription1: jest.Mocked<Subscription>;
  let subscription2: jest.Mocked<Subscription>;
  let subscription3: jest.Mocked<Subscription>;
  const connectAsyncMock: jest.Mock = connectAsync as jest.Mock;
  const certificateData1: AcquireCertificateData = {
    certificateAccount: 'account1',
    certificatePassword: 'pwd1',
    url: 'url1',
    port: '8765',
    protocol: 'mqtts',
  };
  const certificateData3: AcquireCertificateData = {
    certificateAccount: 'account3',
    certificatePassword: 'pwd3',
    url: 'url3',
    port: '8765',
    protocol: 'mqtts',
  };

  function mockMqttDevice(config: DeviceAccessConfig, log: Logging): jest.Mocked<MqttDevice> {
    const mqttDevice = new MqttDevice(config, log) as jest.Mocked<MqttDevice>;
    Object.defineProperty(mqttDevice, 'config', { value: config, configurable: true });
    Object.defineProperty(mqttDevice, 'log', { value: log, configurable: true });
    mqttDevice.subscribeOnMessage.mockReset();
    return mqttDevice;
  }

  beforeEach(() => {
    httpApiManagerMock = {
      acquireCertificate: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowHttpApiManager>;
    log1Mock = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logging>;
    log2Mock = {
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logging>;
    log3Mock = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logging>;
    machineIdProviderMock = {
      getMachineId: jest.fn(),
    } as jest.Mocked<MachineIdProvider>;
    client1Mock = {
      on: jest.fn(),
      publishAsync: jest.fn(),
      subscribeAsync: jest.fn(),
      unsubscribeAsync: jest.fn(),
      end: jest.fn(),
    } as unknown as jest.Mocked<MqttClient>;
    client3Mock = {
      subscribeAsync: jest.fn(),
      unsubscribeAsync: jest.fn(),
      end: jest.fn(),
    } as unknown as jest.Mocked<MqttClient>;
    manager = new EcoFlowMqttApiManager(httpApiManagerMock, machineIdProviderMock);

    connectAsyncMock.mockReset();

    httpApiManagerMock.acquireCertificate.mockImplementation((deviceInfo: DeviceInfo) => {
      if (deviceInfo.accessKey === config1.accessKey) {
        return Promise.resolve(certificateData1);
      } else if (deviceInfo.accessKey === config3.accessKey) {
        return Promise.resolve(certificateData3);
      }
      return Promise.resolve(null);
    });
    machineIdProviderMock.getMachineId.mockResolvedValue('machineId1');
    connectAsyncMock.mockImplementation((_, options: IClientOptions) => {
      if (options.clientId?.endsWith(certificateData1.certificateAccount)) {
        return client1Mock;
      } else if (options.clientId?.endsWith(certificateData3.certificateAccount)) {
        return client3Mock;
      }
      return undefined;
    });

    config1 = {
      name: 'accessory1',
      secretKey: 'secretKey1',
      accessKey: 'accessKey1',
      serialNumber: 'sn1',
      location: LocationType.EU,
    };
    config2 = {
      name: 'accessory2',
      secretKey: 'secretKey1',
      accessKey: 'accessKey1',
      serialNumber: 'sn2',
      location: LocationType.EU,
    };
    config3 = {
      name: 'accessory3',
      secretKey: 'secretKey3',
      accessKey: 'accessKey3',
      serialNumber: 'sn3',
      location: LocationType.EU,
    };
    deviceInfo1 = new DeviceInfo(config1, log1Mock);
    deviceInfo2 = new DeviceInfo(config2, log2Mock);
    deviceInfo3 = new DeviceInfo(config3, log3Mock);

    mqttDevice1Mock = mockMqttDevice(config1, log1Mock);
    mqttDevice2Mock = mockMqttDevice(config2, log2Mock);
    mqttDevice3Mock = mockMqttDevice(config3, log3Mock);
    (MqttDevice as jest.Mock).mockImplementation((config: DeviceConfig) => {
      if (config === config1) {
        return mqttDevice1Mock;
      } else if (config === config2) {
        return mqttDevice2Mock;
      } else if (config === config3) {
        return mqttDevice3Mock;
      }
      return undefined;
    });
    subscription1 = {} as jest.Mocked<Subscription>;
    subscription2 = {} as jest.Mocked<Subscription>;
    subscription3 = {} as jest.Mocked<Subscription>;
    mqttDevice1Mock.subscribeOnMessage.mockReturnValue(subscription1);
    mqttDevice2Mock.subscribeOnMessage.mockReturnValue(subscription2);
    mqttDevice3Mock.subscribeOnMessage.mockReturnValue(subscription3);
  });

  describe('connect', () => {
    it('should not send Set command when it is impossible to acquire certificate', async () => {
      httpApiManagerMock.acquireCertificate.mockReset();
      httpApiManagerMock.acquireCertificate.mockResolvedValueOnce(null);

      await manager.sendSetCommand(deviceInfo1, {
        id: 20,
        version: 'v1',
        operateType: 'ot1',
      });

      expect(machineIdProviderMock.getMachineId).not.toHaveBeenCalled();
      expect(connectAsyncMock).not.toHaveBeenCalled();
    });

    it('should connect to mqtt server when a connection is not established yet', async () => {
      await manager.sendSetCommand(deviceInfo1, {
        id: 20,
        version: 'v1',
        operateType: 'ot1',
      });

      expect(connectAsyncMock).toHaveBeenCalledWith('mqtts://url1:8765', {
        username: 'account1',
        password: 'pwd1',
        clientId: 'HOMEBRIDGE_MACHINEID1_account1',
        protocolVersion: 5,
      });
    });

    it('should use existing connection to mqtt server when a connection is already established', async () => {
      await manager.sendSetCommand(deviceInfo1, {
        id: 20,
        version: 'v1',
        operateType: 'ot1',
      });
      await manager.sendSetCommand(deviceInfo1, {
        id: 21,
        version: 'v2',
        operateType: 'ot2',
      });

      expect(connectAsyncMock).toHaveBeenCalledTimes(1);
      expect(httpApiManagerMock.acquireCertificate).toHaveBeenCalledTimes(1);
    });

    it('should log when connection is established', async () => {
      await manager.sendSetCommand(deviceInfo1, {
        id: 20,
        version: 'v1',
        operateType: 'ot1',
      });
      await manager.sendSetCommand(deviceInfo1, {
        id: 21,
        version: 'v2',
        operateType: 'ot2',
      });

      expect(log1Mock.info).toHaveBeenCalledWith('Connected to EcoFlow MQTT Service');
    });

    it('should subscribe on mqtt messages when connection is established', async () => {
      await manager.sendSetCommand(deviceInfo1, {
        id: 20,
        version: 'v1',
        operateType: 'ot1',
      });

      expect(client1Mock.on).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('processReceivedMessage', () => {
    beforeEach(() => {
      config2.serialNumber = config1.serialNumber;
    });

    async function connect(...deviceInfos: DeviceInfo[]): Promise<void> {
      for (const deviceInfo of deviceInfos) {
        await manager.sendSetCommand(deviceInfo, {
          id: 20,
          version: 'v1',
          operateType: 'ot1',
        });
      }
    }

    function processReceivedMessage(
      topicType: MqttTopicType,
      message: MqttMessage,
      clientMock: jest.Mocked<MqttClient>
    ): void {
      const onMessageCallback: OnMessageCallback = clientMock.on.mock.calls[0][1] as unknown as OnMessageCallback;
      const payload = Buffer.from(JSON.stringify(message));

      onMessageCallback(`/open/account1/sn1/${topicType}`, payload, undefined as unknown as IPublishPacket);
    }

    it('should process quota message in all devices that shares single mqtt client', async () => {
      const message: MqttQuotaMessage = { typeCode: MqttMessageType.EMS };
      await connect(deviceInfo1, deviceInfo2, deviceInfo3);

      processReceivedMessage(MqttTopicType.Quota, message, client1Mock);

      expect(mqttDevice1Mock.processReceivedMessage).toHaveBeenCalledWith(MqttTopicType.Quota, message);
      expect(mqttDevice2Mock.processReceivedMessage).toHaveBeenCalledWith(MqttTopicType.Quota, message);
      expect(mqttDevice3Mock.processReceivedMessage).not.toHaveBeenCalled();
    });

    it('should process set_reply message in all devices that shares single mqtt client', async () => {
      const message: MqttSetReplyMessage = { id: 123, operateType: 'ot1', version: 'v1', data: { ack: false } };
      await connect(deviceInfo1, deviceInfo2, deviceInfo3);

      processReceivedMessage(MqttTopicType.SetReply, message, client1Mock);

      expect(mqttDevice1Mock.processReceivedMessage).toHaveBeenCalledWith(MqttTopicType.SetReply, message);
      expect(mqttDevice2Mock.processReceivedMessage).toHaveBeenCalledWith(MqttTopicType.SetReply, message);
      expect(mqttDevice3Mock.processReceivedMessage).not.toHaveBeenCalled();
    });
  });

  describe('sendSetCommand', () => {
    it('should publish to set topic when it is requested to send set command', async () => {
      const message = { id: 20, version: 'v1', operateType: 'ot1' };
      await manager.sendSetCommand(deviceInfo1, message);

      expect(client1Mock.publishAsync).toHaveBeenCalledWith('/open/account1/sn1/set', JSON.stringify(message));
      expect(log1Mock.debug).toHaveBeenCalledWith("Published to topic '/open/account1/sn1/set':", message);
    });

    it('should not fail a process when sending set command is failed', async () => {
      const message = { id: 20, version: 'v1', operateType: 'ot1' };
      const error = new Error('Access denied');
      client1Mock.publishAsync.mockImplementationOnce(() => {
        throw error;
      });

      await manager.sendSetCommand(deviceInfo1, message);

      expect(client1Mock.publishAsync).toHaveBeenCalledWith('/open/account1/sn1/set', JSON.stringify(message));
      expect(log1Mock.error).toHaveBeenCalledWith(
        'Publishing to topic \'/open/account1/sn1/set\' of message \'{"id":20,"version":"v1","operateType":"ot1"}\' was failed:',
        error
      );
    });
  });

  describe('subscribeOnTopic', () => {
    describe('subscribeOnQuotaTopic', () => {
      it('should not subscribe to quota topic when it is impossible to establish connection to mqtt server', async () => {
        httpApiManagerMock.acquireCertificate.mockReset();
        httpApiManagerMock.acquireCertificate.mockResolvedValueOnce(null);

        const actual = await manager.subscribeOnQuotaTopic(deviceInfo1);

        expect(actual).toBeFalsy();
        expect(client1Mock.subscribeAsync).not.toHaveBeenCalled();
      });

      it('should handle error when subscribing is failed', async () => {
        const error = new Error('Access denied');
        client1Mock.subscribeAsync.mockImplementationOnce(() => {
          throw error;
        });

        const actual = await manager.subscribeOnQuotaTopic(deviceInfo1);

        expect(actual).toBeFalsy();
        expect(log1Mock.error).toHaveBeenCalledWith(
          "Subscribing to topic '/open/account1/sn1/quota' was failed:",
          error
        );
      });

      it('should subscribe to quota topic when it is requested', async () => {
        const actual = await manager.subscribeOnQuotaTopic(deviceInfo1);

        expect(actual).toBeTruthy();
        expect(client1Mock.subscribeAsync).toHaveBeenCalledWith('/open/account1/sn1/quota');
        expect(log1Mock.debug).toHaveBeenCalledWith('Subscribed to topic:', '/open/account1/sn1/quota');
      });
    });

    describe('subscribeOnSetReplyTopic', () => {
      it('should not subscribe to set_reply topic when it is impossible to establish connection to mqtt server', async () => {
        httpApiManagerMock.acquireCertificate.mockReset();
        httpApiManagerMock.acquireCertificate.mockResolvedValueOnce(null);

        const actual = await manager.subscribeOnSetReplyTopic(deviceInfo1);

        expect(actual).toBeFalsy();
        expect(client1Mock.subscribeAsync).not.toHaveBeenCalled();
      });

      it('should handle error when subscribing is failed', async () => {
        const error = new Error('Access denied');
        client1Mock.subscribeAsync.mockImplementationOnce(() => {
          throw error;
        });

        const actual = await manager.subscribeOnSetReplyTopic(deviceInfo1);

        expect(actual).toBeFalsy();
        expect(log1Mock.error).toHaveBeenCalledWith(
          "Subscribing to topic '/open/account1/sn1/set_reply' was failed:",
          error
        );
      });

      it('should subscribe to set_reply topic when it is requested', async () => {
        const actual = await manager.subscribeOnSetReplyTopic(deviceInfo1);

        expect(actual).toBeTruthy();
        expect(client1Mock.subscribeAsync).toHaveBeenCalledWith('/open/account1/sn1/set_reply');
        expect(log1Mock.debug).toHaveBeenCalledWith('Subscribed to topic:', '/open/account1/sn1/set_reply');
      });
    });
  });

  describe('subscribeOnMessage', () => {
    let callbackMock: jest.Mock;

    beforeEach(() => {
      callbackMock = jest.fn();
    });

    describe('subscribeOnQuotaMessage', () => {
      async function connect(...deviceInfos: DeviceInfo[]): Promise<void> {
        for (const deviceInfo of deviceInfos) {
          await manager.subscribeOnQuotaTopic(deviceInfo);
        }
      }

      it('should not subscribe to quota message when connection to mqtt server is not established', async () => {
        const actual = await manager.subscribeOnQuotaMessage(deviceInfo1, callbackMock);

        expect(actual).toBeUndefined();
        expect(mqttDevice1Mock.subscribeOnMessage).not.toHaveBeenCalled();
        expect(mqttDevice2Mock.subscribeOnMessage).not.toHaveBeenCalled();
        expect(mqttDevice3Mock.subscribeOnMessage).not.toHaveBeenCalled();
      });

      it('should not subscribe to quota message when device is not registered for client connection', async () => {
        await connect(deviceInfo1);

        const actual = await manager.subscribeOnQuotaMessage(deviceInfo2, callbackMock);

        expect(actual).toBeUndefined();
        expect(mqttDevice1Mock.subscribeOnMessage).not.toHaveBeenCalled();
        expect(mqttDevice2Mock.subscribeOnMessage).not.toHaveBeenCalled();
        expect(mqttDevice3Mock.subscribeOnMessage).not.toHaveBeenCalled();
      });

      it('should subscribe to quota message when it is requested', async () => {
        await connect(deviceInfo1, deviceInfo2, deviceInfo3);

        const actual = await manager.subscribeOnQuotaMessage(deviceInfo1, callbackMock);

        expect(actual).toBe(subscription1);
        expect(mqttDevice1Mock.subscribeOnMessage).toHaveBeenCalledWith(MqttTopicType.Quota, callbackMock);
        expect(mqttDevice2Mock.subscribeOnMessage).not.toHaveBeenCalled();
        expect(mqttDevice3Mock.subscribeOnMessage).not.toHaveBeenCalled();
      });
    });

    describe('subscribeOnSetReplyMessage', () => {
      async function connect(...deviceInfos: DeviceInfo[]): Promise<void> {
        for (const deviceInfo of deviceInfos) {
          await manager.subscribeOnSetReplyTopic(deviceInfo);
        }
      }

      it('should not subscribe to set_reply message when connection to mqtt server is not established', async () => {
        const actual = await manager.subscribeOnSetReplyMessage(deviceInfo1, callbackMock);

        expect(actual).toBeUndefined();
        expect(mqttDevice1Mock.subscribeOnMessage).not.toHaveBeenCalled();
        expect(mqttDevice2Mock.subscribeOnMessage).not.toHaveBeenCalled();
        expect(mqttDevice3Mock.subscribeOnMessage).not.toHaveBeenCalled();
      });

      it('should not subscribe to set_reply message when device is not registered for client connection', async () => {
        await connect(deviceInfo1);

        const actual = await manager.subscribeOnSetReplyMessage(deviceInfo2, callbackMock);

        expect(actual).toBeUndefined();
        expect(mqttDevice1Mock.subscribeOnMessage).not.toHaveBeenCalled();
        expect(mqttDevice2Mock.subscribeOnMessage).not.toHaveBeenCalled();
        expect(mqttDevice3Mock.subscribeOnMessage).not.toHaveBeenCalled();
      });

      it('should subscribe to set_reply message when it is requested', async () => {
        await connect(deviceInfo1, deviceInfo2, deviceInfo3);

        const actual = await manager.subscribeOnSetReplyMessage(deviceInfo1, callbackMock);

        expect(actual).toBe(subscription1);
        expect(mqttDevice1Mock.subscribeOnMessage).toHaveBeenCalledWith(MqttTopicType.SetReply, callbackMock);
        expect(mqttDevice2Mock.subscribeOnMessage).not.toHaveBeenCalled();
        expect(mqttDevice3Mock.subscribeOnMessage).not.toHaveBeenCalled();
      });
    });
  });

  describe('destroy', () => {
    it('should not unsubscribe from all topics when connection to mqtt server is not established yet', async () => {
      await manager.destroy();

      expect(client1Mock.unsubscribeAsync).not.toHaveBeenCalled();
      expect(client1Mock.end).not.toHaveBeenCalled();
      expect(client3Mock.unsubscribeAsync).not.toHaveBeenCalled();
      expect(client3Mock.end).not.toHaveBeenCalled();
      expect(log1Mock.debug).not.toHaveBeenCalled();
    });

    it(`should unsubscribe from all topics for all devices that shares single mqtt client
      when destroying an EcoFlow MQTT API object`, async () => {
      await manager.subscribeOnSetReplyTopic(deviceInfo1);
      await manager.subscribeOnQuotaTopic(deviceInfo2);

      await manager.destroy();

      expect(client1Mock.unsubscribeAsync).toHaveBeenCalledWith('#');
      expect(client1Mock.end).toHaveBeenCalledTimes(1);
      expect(log1Mock.debug.mock.calls).toEqual([
        ['Subscribed to topic:', '/open/account1/sn1/set_reply'],
        ['Unsubscribed from all topics'],
        ['Disconnected from EcoFlow MQTT Service'],
      ]);
      expect(log2Mock.debug.mock.calls).toEqual([
        ['Subscribed to topic:', '/open/account1/sn2/quota'],
        ['Unsubscribed from all topics'],
        ['Disconnected from EcoFlow MQTT Service'],
      ]);
      expect(client3Mock.unsubscribeAsync).not.toHaveBeenCalledWith('#');
      expect(client3Mock.end).not.toHaveBeenCalled();
      expect(log3Mock.debug).not.toHaveBeenCalled();
    });

    it(`should unsubscribe from all topics for devices that has own mqtt client
      when destroying an EcoFlow MQTT API object`, async () => {
      await manager.subscribeOnSetReplyTopic(deviceInfo1);
      await manager.subscribeOnQuotaTopic(deviceInfo3);

      await manager.destroy();

      expect(client1Mock.unsubscribeAsync).toHaveBeenCalledWith('#');
      expect(client1Mock.end).toHaveBeenCalledTimes(1);
      expect(log1Mock.debug.mock.calls).toEqual([
        ['Subscribed to topic:', '/open/account1/sn1/set_reply'],
        ['Unsubscribed from all topics'],
        ['Disconnected from EcoFlow MQTT Service'],
      ]);
      expect(client3Mock.unsubscribeAsync).toHaveBeenCalledWith('#');
      expect(client3Mock.end).toHaveBeenCalledTimes(1);
      expect(log3Mock.debug.mock.calls).toEqual([
        ['Subscribed to topic:', '/open/account3/sn3/quota'],
        ['Unsubscribed from all topics'],
        ['Disconnected from EcoFlow MQTT Service'],
      ]);
    });
  });
});
