import { ConnectionKey, DeviceInfo } from '@ecoflow/apis/containers/deviceInfo';
import { MqttClientContainer } from '@ecoflow/apis/containers/mqttClientContainer';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { AcquireCertificateData } from '@ecoflow/apis/interfaces/httpApiContracts';
import { MqttMessage, MqttSetMessage, MqttTopicType } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { MockMqttClient } from '@ecoflow/apis/simulations/mockMqttClient';
import { SerialNumber } from '@ecoflow/config';
import { MachineIdProvider } from '@ecoflow/helpers/machineIdProvider';
import mqtt from 'mqtt';
import { Subscription } from 'rxjs';

export class EcoFlowMqttApiManager {
  private readonly clients: Record<ConnectionKey, MqttClientContainer> = {};

  constructor(
    private readonly httpApiManager: EcoFlowHttpApiManager,
    private readonly machineIdProvider: MachineIdProvider
  ) {}

  public async destroy(): Promise<void> {
    for (const connectionKey in this.clients) {
      const apiClient = this.clients[connectionKey];
      await apiClient.client?.unsubscribeAsync('#');
      const devices = apiClient.getAllDevices();
      devices.forEach(device => device.log.debug('Unsubscribed from all topics'));

      await apiClient.client?.endAsync();
      devices.forEach(device => device.log.debug('Disconnected from EcoFlow MQTT Service'));
    }
  }

  public subscribeOnQuotaTopic(deviceInfo: DeviceInfo): Promise<boolean> {
    return this.subscribeOnTopic(deviceInfo, MqttTopicType.Quota);
  }

  public subscribeOnSetReplyTopic(deviceInfo: DeviceInfo): Promise<boolean> {
    return this.subscribeOnTopic(deviceInfo, MqttTopicType.SetReply);
  }

  public subscribeOnQuotaMessage<TMessage>(
    deviceInfo: DeviceInfo,
    callback: (message: TMessage) => void
  ): Subscription | undefined {
    return this.subscribeOnMessage(deviceInfo, MqttTopicType.Quota, callback);
  }

  public subscribeOnSetReplyMessage<TMessage>(
    deviceInfo: DeviceInfo,
    callback: (message: TMessage) => void
  ): Subscription | undefined {
    return this.subscribeOnMessage(deviceInfo, MqttTopicType.SetReply, callback);
  }

  public async sendSetCommand(deviceInfo: DeviceInfo, message: MqttSetMessage): Promise<void> {
    const client = await this.connect(deviceInfo);
    if (client?.isConnected() && client.client) {
      const topic = `/open/${client.certificateData.certificateAccount}/${deviceInfo.config.serialNumber}/set`;
      try {
        await client.client.publishAsync(topic, JSON.stringify(message));
        deviceInfo.log.debug(`Published to topic '${topic}':`, message);
      } catch (err) {
        deviceInfo.log.error(`Publishing to topic '${topic}' of message '${JSON.stringify(message)}' was failed:`, err);
      }
    }
  }

  private async connect(deviceInfo: DeviceInfo): Promise<MqttClientContainer | null> {
    const apiClient = await this.acquireCertificate(deviceInfo);
    if (apiClient && !apiClient.client) {
      const machineId = await this.machineIdProvider.getMachineId(deviceInfo.log);
      const clientId = `HOMEBRIDGE_${machineId.toUpperCase()}_${apiClient.certificateData.certificateAccount}`;
      try {
        const client = await this.connectMqttClient(
          `${apiClient.certificateData.protocol}://${apiClient.certificateData.url}:${apiClient.certificateData.port}`,
          {
            username: `${apiClient.certificateData.certificateAccount}`,
            password: `${apiClient.certificateData.certificatePassword}`,
            clientId,
            protocolVersion: 5,
          },
          deviceInfo
        );
        deviceInfo.log.info('Connected to EcoFlow MQTT Service');
        apiClient.client = client;
        client.on('message', (topic, message) => {
          const mqttMessage = JSON.parse(message.toString());
          this.processReceivedMessage(apiClient, topic, mqttMessage);
        });
      } catch (err) {
        deviceInfo.log.error('Connection to EcoFlow MQTT Service was failed', err);
      }
    }
    apiClient?.addDevice(deviceInfo.config, deviceInfo.log);
    return apiClient;
  }

  private async connectMqttClient(
    brokerUrl: string,
    options: mqtt.IClientOptions,
    deviceInfo: DeviceInfo
  ): Promise<mqtt.MqttClient> {
    if (deviceInfo.config.simulate === true) {
      return new MockMqttClient(deviceInfo, options);
    }
    return await mqtt.connectAsync(brokerUrl, options);
  }

  private async subscribeOnTopic(deviceInfo: DeviceInfo, topicType: MqttTopicType): Promise<boolean> {
    const client = await this.connect(deviceInfo);
    if (client?.isConnected() && client.client) {
      const topic = `/open/${client.certificateData.certificateAccount}/${deviceInfo.config.serialNumber}/${topicType}`;
      try {
        await client.client.subscribeAsync(topic);
        deviceInfo.log.debug('Subscribed to topic:', topic);
        return true;
      } catch (err) {
        deviceInfo.log.error(`Subscribing to topic '${topic}' was failed:`, err);
      }
    }
    return false;
  }

  private subscribeOnMessage<TMessage>(
    deviceInfo: DeviceInfo,
    topicType: MqttTopicType,
    callback: (message: TMessage) => void
  ): Subscription | undefined {
    return this.getApiClient(deviceInfo)
      ?.getDevices(deviceInfo.config.serialNumber)
      .find(device => device.config.name === deviceInfo.config.name)
      ?.subscribeOnMessage(topicType, callback);
  }

  private processReceivedMessage(apiClient: MqttClientContainer, topic: string, message: MqttMessage): void {
    const { serialNumber, topicType } = this.parseTopic(topic);
    const devices = apiClient.getDevices(serialNumber);
    devices.forEach(device => device.processReceivedMessage(topicType, message));
  }

  private async acquireCertificate(deviceInfo: DeviceInfo): Promise<MqttClientContainer | null> {
    let apiClient = this.getApiClient(deviceInfo);
    if (apiClient) {
      return apiClient;
    }
    let certificateData: AcquireCertificateData | null = null;
    if (deviceInfo.config.simulate === true) {
      certificateData = {
        certificateAccount: deviceInfo.config.accessKey,
        certificatePassword: deviceInfo.config.secretKey,
        port: '8883',
        protocol: 'mqtts',
        url: 'fake',
      };
    } else {
      certificateData = await this.httpApiManager.acquireCertificate(deviceInfo);
    }
    if (certificateData) {
      apiClient = new MqttClientContainer(certificateData);
      this.clients[deviceInfo.connectionKey] = apiClient;
      return apiClient;
    }
    return null;
  }

  private getApiClient(deviceInfo: DeviceInfo): MqttClientContainer | null {
    if (deviceInfo.connectionKey in this.clients) {
      return this.clients[deviceInfo.connectionKey];
    }
    return null;
  }

  private parseTopic(topic: string): { serialNumber: SerialNumber | undefined; topicType: MqttTopicType } {
    const parts = topic.split('/');
    const topicType = parts.pop() as MqttTopicType;
    const serialNumber = parts.pop();
    return { serialNumber, topicType };
  }
}
