import { MqttDevice } from '@ecoflow/apis/containers/mqttDevice';
import {
  MqttQuotaMessage,
  MqttSetReplyMessage,
  MqttStatusMessage,
  MqttTopicType,
} from '@ecoflow/apis/interfaces/mqttApiContracts';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';
import { DeviceInfoConfig } from '@ecoflow/config';
import { Logging } from 'homebridge';
import { Observable, Subscription } from 'rxjs';

describe('MqttDevice', () => {
  let logMock: jest.Mocked<Logging>;
  let device: MqttDevice;
  let config: DeviceInfoConfig;
  let quotaCallbackMock: jest.Mock;
  let setReplyCallbackMock: jest.Mock;
  let statusCallbackMock: jest.Mock;

  beforeEach(() => {
    logMock = { debug: jest.fn(), warn: jest.fn() } as unknown as jest.Mocked<Logging>;
    config = { name: 'name1', serialNumber: 'sn1' };
    device = new MqttDevice(config, logMock);

    quotaCallbackMock = jest.fn();
    setReplyCallbackMock = jest.fn();
    statusCallbackMock = jest.fn();
  });

  describe('processReceivedMessage', () => {
    const message = {
      id: 20,
      version: 'v1',
      operateType: 'ot1',
    };
    beforeEach(() => {
      device.subscribeOnMessage(MqttTopicType.Quota, quotaCallbackMock);
      device.subscribeOnMessage(MqttTopicType.SetReply, setReplyCallbackMock);
      device.subscribeOnMessage(MqttTopicType.Status, statusCallbackMock);
    });

    it('should ignore mqtt message when its topic is not supported', async () => {
      device.processReceivedMessage('unknown_topic' as MqttTopicType, message);

      expect(logMock.warn).toHaveBeenCalledWith('Received message for unsupported topic:', 'unknown_topic');
      expect(quotaCallbackMock).not.toHaveBeenCalled();
      expect(setReplyCallbackMock).not.toHaveBeenCalled();
      expect(statusCallbackMock).not.toHaveBeenCalled();
    });

    it('should notify quota subscribers when quota mqtt message is received', () => {
      device.processReceivedMessage(MqttTopicType.Quota, message);

      expect(quotaCallbackMock).toHaveBeenCalledWith(message);
      expect(setReplyCallbackMock).not.toHaveBeenCalled();
      expect(statusCallbackMock).not.toHaveBeenCalled();
    });

    it('should notify set_reply subscribers when set_reply mqtt message is received', () => {
      device.processReceivedMessage(MqttTopicType.SetReply, message);

      expect(setReplyCallbackMock).toHaveBeenCalledWith(message);
      expect(quotaCallbackMock).not.toHaveBeenCalled();
      expect(statusCallbackMock).not.toHaveBeenCalled();
    });

    it('should notify status subscribers when status mqtt message is received', () => {
      device.processReceivedMessage(MqttTopicType.Status, message);

      expect(statusCallbackMock).toHaveBeenCalledWith(message);
      expect(quotaCallbackMock).not.toHaveBeenCalled();
      expect(setReplyCallbackMock).not.toHaveBeenCalled();
    });

    it('should log message when it is received', () => {
      device.processReceivedMessage(MqttTopicType.Quota, message);

      expect(logMock.debug).toHaveBeenCalledWith(
        'Received message (topic: quota): {\n  "id": 20,\n  "version": "v1",\n  "operateType": "ot1"\n}'
      );
    });
  });

  describe('subscribeOnMessage', () => {
    let quotaMock: jest.Mocked<Observable<MqttQuotaMessage>>;
    let setReplyMock: jest.Mocked<Observable<MqttSetReplyMessage>>;
    let statusMock: jest.Mocked<Observable<MqttStatusMessage>>;

    beforeEach(() => {
      quotaMock = { subscribe: jest.fn() } as unknown as jest.Mocked<Observable<MqttQuotaMessage>>;
      setReplyMock = { subscribe: jest.fn() } as unknown as jest.Mocked<Observable<MqttSetReplyMessage>>;
      statusMock = { subscribe: jest.fn() } as unknown as jest.Mocked<Observable<MqttStatusMessage>>;
      Object.defineProperty(device, 'quota$', { value: quotaMock, configurable: true });
      Object.defineProperty(device, 'setReply$', { value: setReplyMock, configurable: true });
      Object.defineProperty(device, 'status$', { value: statusMock, configurable: true });
    });

    it('should ignore subscription to topic when it is not supported', async () => {
      const actual = device.subscribeOnMessage('unknown_topic' as MqttTopicType, quotaCallbackMock);

      expect(actual).toBeUndefined();
      expect(logMock.warn).toHaveBeenCalledWith('Topic is not supported for subscription:', 'unknown_topic');
      expect(quotaMock.subscribe).not.toHaveBeenCalled();
      expect(setReplyMock.subscribe).not.toHaveBeenCalled();
      expect(statusMock.subscribe).not.toHaveBeenCalled();
    });

    it('should subscribe on quota$ observable and return subscription when subscribing on quota topic', () => {
      const expected = {} as jest.Mocked<Subscription>;
      quotaMock.subscribe.mockReturnValueOnce(expected);

      const actual = device.subscribeOnMessage(MqttTopicType.Quota, quotaCallbackMock);

      expect(actual).toBe(expected);
    });

    it('should subscribe on quota$ observable when subscribing on quota topic', () => {
      const quotaMessage: MqttQuotaMessage = { param1: '1' };
      quotaMock.subscribe.mockReturnValueOnce({} as jest.Mocked<Subscription>);

      device.subscribeOnMessage(MqttTopicType.Quota, quotaCallbackMock);
      const subscriptionCallback = quotaMock.subscribe.mock.calls[0][0]!;
      subscriptionCallback(quotaMessage);

      expect(quotaCallbackMock).toHaveBeenCalledWith(quotaMessage);
    });

    it('should subscribe on setReply$ observable when subscribing on set_reply topic', () => {
      const setReplyMessage: MqttSetReplyMessage = { id: 1, data: { ack: false }, version: 'v1' };
      setReplyMock.subscribe.mockReturnValueOnce({} as jest.Mocked<Subscription>);

      device.subscribeOnMessage(MqttTopicType.SetReply, setReplyCallbackMock);
      const subscriptionCallback = setReplyMock.subscribe.mock.calls[0][0]!;
      subscriptionCallback(setReplyMessage);

      expect(setReplyCallbackMock).toHaveBeenCalledWith(setReplyMessage);
    });

    it('should subscribe on status$ observable when subscribing on status topic', () => {
      const statusMessage: MqttStatusMessage = {
        id: '1',
        version: 'v1',
        timestamp: 123,
        params: { status: EnableType.On },
      };
      statusMock.subscribe.mockReturnValueOnce({} as jest.Mocked<Subscription>);

      device.subscribeOnMessage(MqttTopicType.Status, statusCallbackMock);
      const subscriptionCallback = statusMock.subscribe.mock.calls[0][0]!;
      subscriptionCallback(statusMessage);

      expect(statusCallbackMock).toHaveBeenCalledWith(statusMessage);
    });
  });
});
