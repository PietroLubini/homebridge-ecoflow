import { ConnectionKey, DeviceInfo } from '@ecoflow/apis/containers/deviceInfo';
import { MqttClient } from '@ecoflow/apis/containers/mqttClient';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { MqttMessage, MqttSetMessage, MqttTopicType } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { SerialNumber } from '@ecoflow/config';
import { MachineIdProvider } from '@ecoflow/helpers/machineIdProvider';
import mqtt from 'mqtt';
import { Subscription } from 'rxjs';

export class EcoFlowMqttApiManager {
  private readonly clients: Record<ConnectionKey, MqttClient> = {};

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

      await apiClient.client?.end();
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
    if (client?.isConnected()) {
      const topic = `/open/${client.certificateData!.certificateAccount}/${deviceInfo.config.serialNumber}/set`;
      try {
        await client.client!.publishAsync(topic, JSON.stringify(message));
        deviceInfo.log.debug(`Published to topic '${topic}':`, message);
      } catch (err) {
        deviceInfo.log.error(`Publishing to topic '${topic}' of message '${JSON.stringify(message)}' was failed:`, err);
      }
    }
  }

  private async connect(deviceInfo: DeviceInfo): Promise<MqttClient | null> {
    const apiClient = await this.acquireCertificate(deviceInfo);
    if (apiClient && !apiClient.client) {
      const machineId = await this.machineIdProvider.getMachineId(deviceInfo.log);
      const clientId = `HOMEBRIDGE_${machineId.toUpperCase()}_${apiClient.certificateData.certificateAccount}`;
      try {
        const client = await mqtt.connectAsync(
          `${apiClient.certificateData.protocol}://${apiClient.certificateData.url}:${apiClient.certificateData.port}`,
          {
            username: `${apiClient.certificateData.certificateAccount}`,
            password: `${apiClient.certificateData.certificatePassword}`,
            clientId,
            protocolVersion: 5,
          }
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

  private async subscribeOnTopic(deviceInfo: DeviceInfo, topicType: MqttTopicType): Promise<boolean> {
    const client = await this.connect(deviceInfo);
    if (client?.isConnected()) {
      const topic = `/open/${client.certificateData!.certificateAccount}/${deviceInfo.config.serialNumber}/${topicType}`;
      try {
        await client.client!.subscribeAsync(topic);
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

  private processReceivedMessage(apiClient: MqttClient, topic: string, message: MqttMessage): void {
    const { serialNumber, topicType } = this.parseTopic(topic);
    const devices = apiClient.getDevices(serialNumber);
    devices.forEach(device => device.processReceivedMessage(topicType, message));
  }

  private async acquireCertificate(deviceInfo: DeviceInfo): Promise<MqttClient | null> {
    let apiClient = this.getApiClient(deviceInfo);
    if (apiClient) {
      return apiClient;
    }
    const certificateData = await this.httpApiManager.acquireCertificate(deviceInfo);
    if (certificateData) {
      apiClient = new MqttClient(certificateData);
      this.clients[deviceInfo.connectionKey] = apiClient;
      return apiClient;
    }
    return null;
  }

  private getApiClient(deviceInfo: DeviceInfo): MqttClient | null {
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
