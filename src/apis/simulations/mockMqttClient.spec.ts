import { DeviceInfo } from '@ecoflow/apis/containers/deviceInfo';
import { MqttSetMessage, MqttSetReplyMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { MockMqttClient } from '@ecoflow/apis/simulations/mockMqttClient';
import { SimulatorTyped } from '@ecoflow/apis/simulations/simulator';
import { DeviceAccessConfig } from '@ecoflow/config';
import { sleep } from '@ecoflow/helpers/tests/sleep';
import { Logging } from 'homebridge';
import { IClientOptions } from 'mqtt';

interface MockMqttSetMessage extends MqttSetMessage {
  param1: number;
  param2: string;
}

interface MockMqttSetReplyMessage extends MqttSetReplyMessage {
  param1: number;
  param2: string;
}

class MockSimulator extends SimulatorTyped<MockMqttSetMessage> {
  public generateQuota(): object {
    const quota: MockMqttSetMessage = {
      id: 1,
      version: '2',
      param1: 3,
      param2: '4',
    };
    return quota;
  }

  public generateSetReplyTyped(message: MockMqttSetMessage): object {
    const reply: MockMqttSetReplyMessage = {
      id: message.id,
      version: message.version,
      param1: message.param1,
      param2: message.param2,
      data: {
        ack: false,
      },
    };

    return reply;
  }
}

describe('MockMqttClient', () => {
  let logMock: jest.Mocked<Logging>;
  let config: DeviceAccessConfig;
  let deviceInfo: DeviceInfo;
  let options: jest.Mocked<IClientOptions>;
  let emitMock: jest.Mock;
  let client: MockMqttClient;

  beforeEach(() => {
    logMock = {
      warn: jest.fn(),
    } as unknown as jest.Mocked<Logging>;
    config = {
      simulator: MockSimulator,
      simulateQuotaTimeoutMs: 100,
    } as unknown as DeviceAccessConfig;
    deviceInfo = new DeviceInfo(config, logMock);
    options = {} as jest.Mocked<IClientOptions>;
    emitMock = jest.fn();

    client = new MockMqttClient(deviceInfo, options);
    client.emit = emitMock;
  });

  afterEach(async () => {
    await client.endAsync();
  });

  function waitMqttReconnection(attempts: number): Promise<void> {
    return sleep(config.simulateQuotaTimeoutMs! * (1 / 2 + attempts));
  }

  describe('initialize', () => {
    it('should mock connection when create new instance of mock mqtt client', async () => {
      const client1 = new MockMqttClient(deviceInfo, options);

      expect(client1.connected).toBeTruthy();
      expect(logMock.warn).toHaveBeenCalledWith('Simulating MQTT');
    });
  });

  describe('endAsync', () => {
    it('should do nothing when ending connection and there were no subscribeAsync calls', async () => {
      await client.endAsync();
      await waitMqttReconnection(1);

      expect(emitMock).toHaveBeenCalledTimes(0);
    });

    it('should stop emitting quota when ending connection and there was subscription to quota topic', async () => {
      await client.subscribeAsync('/some/sn/quota');
      await waitMqttReconnection(1);

      await client.endAsync();
      await waitMqttReconnection(2);

      expect(emitMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribeAsync', () => {
    it('should return empty array of subscriptions when subscribeAsync is called', async () => {
      const actual = await client.subscribeAsync('/some/sn/quota');

      expect(actual).toEqual([]);
    });

    it('should emit quota when there was subscription to quota topic', async () => {
      await client.subscribeAsync('/some/sn/quota');
      await waitMqttReconnection(2);

      expect(emitMock).toHaveBeenCalledTimes(2);
    });

    it('should emit quota from simulator when there was subscription to quota topic', async () => {
      await client.subscribeAsync('/some/sn/quota');
      await client.subscribeAsync('/some/sn/set_reply');
      await waitMqttReconnection(1);

      expect(emitMock.mock.calls).toEqual([
        [
          'message',
          '/some/sn/quota',
          Buffer.from(
            JSON.stringify({
              id: 1,
              version: '2',
              param1: 3,
              param2: '4',
            })
          ),
          undefined,
        ],
      ]);
    });

    it('should not emit quota when there was no subscription to quota topic', async () => {
      await client.subscribeAsync('/some/sn/set_reply');
      await waitMqttReconnection(2);

      expect(emitMock).toHaveBeenCalledTimes(0);
    });
  });

  describe('publishAsync', () => {
    beforeEach(() => {
      deviceInfo.config.simulateQuotaTimeoutMs = undefined;
      client = new MockMqttClient(deviceInfo, options);
      client.emit = emitMock;
    });

    it('should not emit set_reply message when simulator is not defined', async () => {
      deviceInfo.config.simulator = undefined;
      const client1 = new MockMqttClient(deviceInfo, options);
      client1.emit = emitMock;

      const actual = await client1.publishAsync('/some/sn/set', 'message');

      expect(emitMock).not.toHaveBeenCalled();
      expect(actual).toBeUndefined();
    });

    it('should not emit set_reply message when publishing to unknown topic', async () => {
      await client.publishAsync('/some/sn/unknown', 'message');

      expect(emitMock).not.toHaveBeenCalled();
    });

    it('should not emit set_reply message when there is no subscription for set_reply topic', async () => {
      await client.subscribeAsync('/some/sn/quota');

      await client.publishAsync('/some/sn/set', 'message');

      expect(emitMock).not.toHaveBeenCalled();
    });

    it('should emit set_reply message when there is subscription for set_reply topic', async () => {
      const message: MockMqttSetMessage = {
        id: 10,
        version: '20',
        param1: 30,
        param2: '40',
      };
      await client.subscribeAsync('/some/sn/set_reply');

      await client.publishAsync('/some/sn/set', JSON.stringify(message));

      expect(emitMock.mock.calls).toEqual([
        [
          'message',
          '/some/sn/set_reply',
          Buffer.from(
            JSON.stringify({
              id: 10,
              version: '20',
              param1: 30,
              param2: '40',
              data: {
                ack: false,
              },
            })
          ),
          undefined,
        ],
      ]);
    });
  });
});
