import { Logging } from 'homebridge';
import mqtt, { MqttClient } from 'mqtt';
import { Subject } from 'rxjs';
import { getMachineId } from '../helpers/machineId.js';
import { AcquireCertificateData, EcoFlowHttpApi } from './ecoFlowHttpApi.js';

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
  public readonly quota$ = this.quotaSubject.asObservable();
  public readonly setReply$ = this.setReplySubject.asObservable();

  constructor(
    private httpApi: EcoFlowHttpApi,
    private log: Logging
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
      await client.publishAsync(topic, JSON.stringify(message));
      this.log.debug(`Published to topic '${topic}'`, message);
    }
  }

  private async connect(): Promise<mqtt.MqttClient | null> {
    if (!this.client) {
      const certificateData = await this.acquireCertificate();
      if (certificateData) {
        const clientId = `HOMEBRIDGE_${(await getMachineId(this.log)).toUpperCase()}`;
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

        this.client.on('message', (topic, message) => {
          const mqttMessage = JSON.parse(message.toString());
          this.processReceivedMessage((topic.split('/').pop() || '') as MqttTopicType, mqttMessage);
        });
      }
    }
    return this.client;
  }

  private async subscribe(serialNumber: string, topicType: MqttTopicType): Promise<boolean> {
    const client = await this.connect();
    if (client) {
      const topic = `/open/${this.certificateData!.certificateAccount}/${serialNumber}/${topicType}`;
      await client.subscribeAsync(topic);
      this.log.debug('Subscribed to topic:', topic);
      return true;
    }
    return false;
  }

  private processReceivedMessage(topicType: MqttTopicType, message: object): void {
    switch (topicType) {
      case MqttTopicType.Quota:
        this.quotaSubject.next(message as MqttQuotaMessage);
        break;
      case MqttTopicType.SetReply:
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
