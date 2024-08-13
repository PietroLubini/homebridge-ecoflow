import { AcquireCertificateData, EcoFlowHttpApi } from '@ecoflow/apis/ecoFlowHttpApi';
import { EcoFlowMqttApi } from '@ecoflow/apis/ecoFlowMqttApi';
import { MachineIdProvider } from '@ecoflow/helpers/machineIdProvider';
import { Logging } from 'homebridge';
import { connectAsync, IPublishPacket, MqttClient, OnMessageCallback } from 'mqtt';

jest.mock('mqtt');

describe('EcoFlowMqttApi', () => {
  let httpApiMock: jest.Mocked<EcoFlowHttpApi>;
  let logMock: jest.Mocked<Logging>;
  let machineIdProviderMock: jest.Mocked<MachineIdProvider>;
  let clientMock: jest.Mocked<MqttClient>;
  let api: EcoFlowMqttApi;
  const connectAsyncMock: jest.Mock = connectAsync as jest.Mock;
  const certificateData: AcquireCertificateData = {
    certificateAccount: 'account1',
    certificatePassword: 'pwd1',
    url: 'url1',
    port: '8765',
    protocol: 'mqtts',
  };

  beforeEach(() => {
    httpApiMock = {
      acquireCertificate: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowHttpApi>;
    logMock = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<Logging>;
    machineIdProviderMock = {
      getMachineId: jest.fn(),
    } as unknown as jest.Mocked<MachineIdProvider>;
    clientMock = {
      on: jest.fn(),
      publishAsync: jest.fn(),
      subscribeAsync: jest.fn(),
      unsubscribeAsync: jest.fn(),
      end: jest.fn(),
    } as unknown as jest.Mocked<MqttClient>;
    api = new EcoFlowMqttApi(httpApiMock, logMock, machineIdProviderMock);

    httpApiMock.acquireCertificate.mockReset();
    machineIdProviderMock.getMachineId.mockReset();
    connectAsyncMock.mockReset();

    httpApiMock.acquireCertificate.mockResolvedValueOnce(certificateData);
    machineIdProviderMock.getMachineId.mockResolvedValue('machineId1');
    connectAsyncMock.mockResolvedValueOnce(clientMock);
  });

  describe('connect', () => {
    it('should not send Set command when it is impossible to acquire certificate', async () => {
      httpApiMock.acquireCertificate.mockReset();
      httpApiMock.acquireCertificate.mockResolvedValueOnce(null);

      await api.sendSetCommand('sn1', {
        id: 20,
        version: 'v1',
        operateType: 'ot1',
      });

      expect(machineIdProviderMock.getMachineId).not.toHaveBeenCalled();
      expect(connectAsyncMock).not.toHaveBeenCalled();
    });

    it('should connect to mqtt server when a connection is not established yet', async () => {
      await api.sendSetCommand('sn1', {
        id: 20,
        version: 'v1',
        operateType: 'ot1',
      });

      expect(connectAsyncMock).toHaveBeenCalledWith('mqtts://url1:8765', {
        username: 'account1',
        password: 'pwd1',
        clientId: 'HOMEBRIDGE_MACHINEID1',
        protocolVersion: 5,
      });
    });

    it('should use existing connection to mqtt server when a connection is already established', async () => {
      await api.sendSetCommand('sn1', {
        id: 20,
        version: 'v1',
        operateType: 'ot1',
      });
      await api.sendSetCommand('sn1', {
        id: 21,
        version: 'v2',
        operateType: 'ot2',
      });

      expect(connectAsyncMock).toHaveBeenCalledTimes(1);
      expect(httpApiMock.acquireCertificate).toHaveBeenCalledTimes(1);
    });

    it('should log when connection is established', async () => {
      await api.sendSetCommand('sn1', {
        id: 20,
        version: 'v1',
        operateType: 'ot1',
      });
      await api.sendSetCommand('sn1', {
        id: 21,
        version: 'v2',
        operateType: 'ot2',
      });

      expect(logMock.info).toHaveBeenCalledWith('Connected to EcoFlow MQTT Service');
    });

    it('should subscribe on mqtt messages when connection is established', async () => {
      await api.sendSetCommand('sn1', {
        id: 20,
        version: 'v1',
        operateType: 'ot1',
      });

      expect(clientMock.on).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('processReceivedMessage', () => {
    it('should ignore mqtt message when its topic is not supported', async () => {
      await api.sendSetCommand('sn1', {
        id: 20,
        version: 'v1',
        operateType: 'ot1',
      });
      const onMessageCallback: OnMessageCallback = clientMock.on.mock.calls[0][1] as unknown as OnMessageCallback;
      const payload = Buffer.from(JSON.stringify({}));

      onMessageCallback('/open/account1/sn1/unknown_topic', payload, undefined as unknown as IPublishPacket);

      expect(logMock.warn).toHaveBeenCalledWith('Received message for unsupported topic:', 'unknown_topic');
    });

    it('should notify quota subscribers when quota mqtt message is received', done => {
      api.quota$.subscribe(value => {
        expect(value).toEqual({ typeCode: 'pdStatus' });
        done();
      });

      api.sendSetCommand('sn1', { id: 20, version: 'v1', operateType: 'ot1' }).then(() => {
        const onMessageCallback: OnMessageCallback = clientMock.on.mock.calls[0][1] as unknown as OnMessageCallback;
        const payload = Buffer.from(JSON.stringify({ typeCode: 'pdStatus' }));

        onMessageCallback('/open/account1/sn1/quota', payload, undefined as unknown as IPublishPacket);
      });
    });

    it('should notify set_reply subscribers when set_reply mqtt message is received', done => {
      api.setReply$.subscribe(value => {
        expect(value).toEqual({ data: { ack: true } });
        done();
      });

      api.sendSetCommand('sn1', { id: 20, version: 'v1', operateType: 'ot1' }).then(() => {
        const onMessageCallback: OnMessageCallback = clientMock.on.mock.calls[0][1] as unknown as OnMessageCallback;
        const payload = Buffer.from(JSON.stringify({ data: { ack: true } }));

        onMessageCallback('/open/account1/sn1/set_reply', payload, undefined as unknown as IPublishPacket);
      });
    });
  });

  describe('sendSetCommand', () => {
    it('should publish to set topic when it is requested to send set command', async () => {
      const message = { id: 20, version: 'v1', operateType: 'ot1' };
      await api.sendSetCommand('sn1', message);

      expect(clientMock.publishAsync).toHaveBeenCalledWith('/open/account1/sn1/set', JSON.stringify(message));
      expect(logMock.debug).toHaveBeenCalledWith("Published to topic '/open/account1/sn1/set':", message);
    });
  });

  describe('subscribeOnQuota', () => {
    it('should not subscribe to quota topic when it is impossible to establish connection to mqtt server', async () => {
      httpApiMock.acquireCertificate.mockReset();
      httpApiMock.acquireCertificate.mockResolvedValueOnce(null);

      const actual = await api.subscribeOnQuota('sn1');

      expect(actual).toBeFalsy();
      expect(clientMock.subscribeAsync).not.toHaveBeenCalled();
    });

    it('should subscribe to quota topic when it is requested', async () => {
      const actual = await api.subscribeOnQuota('sn1');

      expect(actual).toBeTruthy();
      expect(clientMock.subscribeAsync).toHaveBeenCalledWith('/open/account1/sn1/quota');
      expect(logMock.debug).toHaveBeenCalledWith('Subscribed to topic:', '/open/account1/sn1/quota');
    });
  });

  describe('subscribeOnSetReply', () => {
    it('should not subscribe to set_reply topic when it is impossible to establish connection to mqtt server', async () => {
      httpApiMock.acquireCertificate.mockReset();
      httpApiMock.acquireCertificate.mockResolvedValueOnce(null);

      const actual = await api.subscribeOnSetReply('sn1');

      expect(actual).toBeFalsy();
      expect(clientMock.subscribeAsync).not.toHaveBeenCalled();
    });

    it('should subscribe to set_reply topic when it is requested', async () => {
      const actual = await api.subscribeOnSetReply('sn1');

      expect(actual).toBeTruthy();
      expect(clientMock.subscribeAsync).toHaveBeenCalledWith('/open/account1/sn1/set_reply');
      expect(logMock.debug).toHaveBeenCalledWith('Subscribed to topic:', '/open/account1/sn1/set_reply');
    });
  });

  describe('destroy', () => {
    it('should not unsubscribe from all topics when connection to mqtt server is not established yet', async () => {
      await api.destroy();

      expect(clientMock.unsubscribeAsync).not.toHaveBeenCalled();
      expect(clientMock.end).not.toHaveBeenCalled();
      expect(logMock.debug).toHaveBeenCalledWith('Unsubscribed from all topics');
      expect(logMock.info).toHaveBeenCalledWith('Disconnected from EcoFlow MQTT Service');
    });

    it('should unsubscribe from all topics when destroying an EcoFlow MQTT API object', async () => {
      await api.subscribeOnSetReply('sn1');

      await api.destroy();

      expect(clientMock.unsubscribeAsync).toHaveBeenCalledWith('#');
      expect(clientMock.end).toHaveBeenCalledTimes(1);
      expect(logMock.debug).toHaveBeenCalledWith('Unsubscribed from all topics');
      expect(logMock.info).toHaveBeenCalledWith('Disconnected from EcoFlow MQTT Service');
    });
  });
});
