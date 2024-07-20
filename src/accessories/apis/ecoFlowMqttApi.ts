import { Logging } from 'homebridge';
import mqtt, { MqttClient } from 'mqtt';
import { Subject } from 'rxjs';
import { getMachineId } from './../../helpers/machineId.js';
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

export interface MqttSetReplyMessage {
  id: number;
  version: string;
  moduleType: number;
  operateType: string;
}

export interface MqttSetReplyMessageWithParams<TParams> extends MqttSetReplyMessage {
  params: TParams;
}

export class EcoFlowMqttApi {
  private client: MqttClient | null = null;
  private certificateData: AcquireCertificateData | null = null;
  private readonly quotaSubject: Subject<MqttQuotaMessage> = new Subject<MqttQuotaMessage>();
  public readonly quota$ = this.quotaSubject.asObservable();

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

  public async subscribeQuota(serialNumber: string): Promise<boolean> {
    const client = await this.connect();
    if (client) {
      const topic = `/open/${this.certificateData!.certificateAccount}/${serialNumber}/quota`;
      await client.subscribeAsync(topic);
      this.log.debug('Subscribed to topic:', topic);
      client.on('message', (_, message) => {
        const mqttMessage = JSON.parse(message.toString()) as MqttQuotaMessage;
        this.quotaSubject.next(mqttMessage);
      });
      return true;
    }
    return false;
  }

  public async sendSetCommand<TParams>(
    serialNumber: string,
    moduleType: number,
    operateType: string,
    params: TParams
  ): Promise<void> {
    const data: MqttSetReplyMessageWithParams<TParams> = {
      id: Math.floor(Math.random() * 1000000),
      version: '1.0',
      moduleType,
      operateType,
      params,
    };
    const client = await this.connect();
    if (client) {
      const topic = `/open/${this.certificateData!.certificateAccount}/${serialNumber}/set`;
      const message = JSON.stringify(data);
      await client.publishAsync(topic, message);
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
      }
    }
    return this.client;
  }

  private async acquireCertificate(): Promise<AcquireCertificateData | null> {
    if (!this.certificateData) {
      this.certificateData = await this.httpApi.acquireCertificate();
    }
    return this.certificateData;
  }
}
