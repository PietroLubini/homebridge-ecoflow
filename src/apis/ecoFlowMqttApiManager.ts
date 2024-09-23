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
  private readonly mqttClientContainers: Record<ConnectionKey, MqttClientContainer> = {};

  constructor(
    private readonly httpApiManager: EcoFlowHttpApiManager,
    private readonly machineIdProvider: MachineIdProvider
  ) {}

  public async destroy(): Promise<void> {
    for (const connectionKey in this.mqttClientContainers) {
      const mqttClientContainer = this.mqttClientContainers[connectionKey];
      await mqttClientContainer.client?.unsubscribeAsync('#');
      const devices = mqttClientContainer.getAllDevices();
      devices.forEach(device => device.log.debug('Unsubscribed from all topics'));

      await mqttClientContainer.client?.endAsync();
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
    const mqttClientContainer = await this.acquireCertificate(deviceInfo);
    if (mqttClientContainer && !mqttClientContainer.client) {
      const machineId = await this.machineIdProvider.getMachineId(deviceInfo.log);
      const clientId = `HOMEBRIDGE_${machineId.toUpperCase()}_${mqttClientContainer.certificateData.certificateAccount}`;
      try {
        const certificateData = mqttClientContainer.certificateData;
        const client = await this.connectMqttClient(
          `${certificateData.protocol}://${certificateData.url}:${certificateData.port}`,
          {
            username: `${certificateData.certificateAccount}`,
            password: `${certificateData.certificatePassword}`,
            clientId,
            protocolVersion: 5,
          },
          deviceInfo
        );
        deviceInfo.log.info('Connected to EcoFlow MQTT Service');
        mqttClientContainer.client = client;
        client.on('message', (topic, message) => {
          const mqttMessage = JSON.parse(message.toString());
          this.processReceivedMessage(mqttClientContainer, topic, mqttMessage);
        });
      } catch (err) {
        deviceInfo.log.error('Connection to EcoFlow MQTT Service was failed', err);
      }
    }
    mqttClientContainer?.addDevice(deviceInfo.config, deviceInfo.log);
    return mqttClientContainer;
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
    return this.getMqttClientContainer(deviceInfo)
      ?.getDevices(deviceInfo.config.serialNumber)
      .find(device => device.config.name === deviceInfo.config.name)
      ?.subscribeOnMessage(topicType, callback);
  }

  private processReceivedMessage(container: MqttClientContainer, topic: string, message: MqttMessage): void {
    const { serialNumber, topicType } = this.parseTopic(topic);
    const devices = container.getDevices(serialNumber);
    devices.forEach(device => device.processReceivedMessage(topicType, message));
  }

  private async acquireCertificate(deviceInfo: DeviceInfo): Promise<MqttClientContainer | null> {
    let mqttClientContainer = this.getMqttClientContainer(deviceInfo);
    if (mqttClientContainer) {
      return mqttClientContainer;
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
      mqttClientContainer = new MqttClientContainer(certificateData);
      this.mqttClientContainers[deviceInfo.connectionKey] = mqttClientContainer;
      return mqttClientContainer;
    }
    return null;
  }

  private getMqttClientContainer(deviceInfo: DeviceInfo): MqttClientContainer | null {
    if (deviceInfo.connectionKey in this.mqttClientContainers) {
      return this.mqttClientContainers[deviceInfo.connectionKey];
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
