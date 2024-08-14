import { AcquireCertificateData, EcoFlowHttpApi } from '@ecoflow/apis/ecoFlowHttpApi';
import { MachineIdProvider } from '@ecoflow/helpers/machineIdProvider';
import { Logging } from 'homebridge';
import mqtt, { MqttClient } from 'mqtt';
import { Observable, Subject } from 'rxjs';

export enum MqttMessageType {
  PD = 'pdStatus',
  MPPT = 'mpptStatus',
  INV = 'invStatus',
  BMS = 'bmsStatus',
  EMS = 'emsStatus',
}

export interface MqttQuotaMessage {
  typeCode: MqttMessageType;
}

export interface MqttQuotaMessageWithParams<TParams> extends MqttQuotaMessage {
  typeCode: MqttMessageType;
  params: TParams;
}

export interface MqttSetMessage {
  id: number;
  version: string;
  operateType: string;
}

export interface MqttSetMessageWithParams<TParams> extends MqttSetMessage {
  moduleType: number;
  params: TParams;
}

export interface MqttSetReplyMessage extends MqttSetMessage {
  data: {
    ack: boolean;
  };
}

export enum MqttTopicType {
  Quota = 'quota',
  SetReply = 'set_reply',
}

export class EcoFlowMqttApi {
  private client: MqttClient | null = null;
  private certificateData: AcquireCertificateData | null = null;
  private readonly quotaSubject: Subject<MqttQuotaMessage> = new Subject<MqttQuotaMessage>();
  private readonly setReplySubject: Subject<MqttSetReplyMessage> = new Subject<MqttSetReplyMessage>();
  public readonly quota$: Observable<MqttQuotaMessage> = this.quotaSubject.asObservable();
  public readonly setReply$: Observable<MqttSetReplyMessage> = this.setReplySubject.asObservable();

  constructor(
    private readonly httpApi: EcoFlowHttpApi,
    private readonly log: Logging,
    private readonly machineIdProvider: MachineIdProvider
  ) {}

  public async destroy(): Promise<void> {
    await this.client?.unsubscribeAsync('#');
    this.log.debug('Unsubscribed from all topics');

    await this.client?.end();
    this.log.info('Disconnected from EcoFlow MQTT Service');
  }

  public subscribeOnQuota(serialNumber: string): Promise<boolean> {
    return this.subscribe(serialNumber, MqttTopicType.Quota);
  }

  public subscribeOnSetReply(serialNumber: string): Promise<boolean> {
    return this.subscribe(serialNumber, MqttTopicType.SetReply);
  }

  public async sendSetCommand(serialNumber: string, message: MqttSetMessage): Promise<void> {
    const client = await this.connect();
    if (client) {
      const topic = `/open/${this.certificateData!.certificateAccount}/${serialNumber}/set`;
      try {
        await client.publishAsync(topic, JSON.stringify(message));
        this.log.debug(`Published to topic '${topic}':`, message);
      } catch (err) {
        this.log.error(`Publishing to topic '${topic}' of message '${JSON.stringify(message)}' was failed:`, err);
      }
    }
  }

  private async connect(): Promise<mqtt.MqttClient | null> {
    if (!this.client) {
      const certificateData = await this.acquireCertificate();
      if (certificateData) {
        const clientId = `HOMEBRIDGE_${(await this.machineIdProvider.getMachineId()).toUpperCase()}`;
        try {
          this.client = await mqtt.connectAsync(
            `${certificateData.protocol}://${certificateData.url}:${certificateData.port}`,
            {
              username: `${certificateData.certificateAccount}`,
              password: `${certificateData.certificatePassword}`,
              clientId,
              protocolVersion: 5,
            }
          );
          this.log.info('Connected to EcoFlow MQTT Service');
        } catch (err) {
          this.log.error('Connection to EcoFlow MQTT Service was failed', err);
        }
        this.client?.on('message', (topic, message) => {
          const mqttMessage = JSON.parse(message.toString());
          this.processReceivedMessage(topic, topic.split('/').pop() as MqttTopicType, mqttMessage);
        });
      }
    }
    return this.client;
  }

  private async subscribe(serialNumber: string, topicType: MqttTopicType): Promise<boolean> {
    const client = await this.connect();
    if (client) {
      const topic = `/open/${this.certificateData!.certificateAccount}/${serialNumber}/${topicType}`;
      try {
        await client.subscribeAsync(topic);
        this.log.debug('Subscribed to topic:', topic);
        return true;
      } catch (err) {
        this.log.error(`Subscribing to topic '${topic}' was failed:`, err);
      }
    }
    return false;
  }

  private processReceivedMessage(topic: string, topicType: MqttTopicType, message: object): void {
    switch (topicType) {
      case MqttTopicType.Quota:
        this.quotaSubject.next(message as MqttQuotaMessage);
        break;
      case MqttTopicType.SetReply:
        this.log.debug(`Read from topic '${topic}':`, message);
        this.setReplySubject.next(message as MqttSetReplyMessage);
        break;
      default:
        this.log.warn('Received message for unsupported topic:', topicType);
    }
  }

  private async acquireCertificate(): Promise<AcquireCertificateData | null> {
    if (!this.certificateData) {
      this.certificateData = await this.httpApi.acquireCertificate();
    }
    return this.certificateData;
  }
}
