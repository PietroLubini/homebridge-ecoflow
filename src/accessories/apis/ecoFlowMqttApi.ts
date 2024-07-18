import mqtt, { MqttClient } from 'mqtt';
import { Logging } from 'homebridge';
import {
  BmsStatusMqttMessageParams,
  InvStatusMqttMessageParams,
  MqttMessage,
  MqttMessageParams,
  MqttMessageType,
  MqttSetMessageBase,
  PdStatusMqttMessageParams,
} from './interfaces/ecoFlowMqttContacts.js';
import { Subject } from 'rxjs';
import { getMachineId } from './../../helpers/machineId.js';
import { AcquireCertificateResponseData } from './interfaces/ecoFlowHttpContacts.js';
import { EcoFlowHttpApi } from './ecoFlowHttpApi.js';

export class EcoFlowMqttApi {
  private client: MqttClient | null = null;
  private certificateData: AcquireCertificateResponseData | null = null;
  private readonly bmsParamsSubject: Subject<BmsStatusMqttMessageParams> = new Subject<BmsStatusMqttMessageParams>();
  private readonly invParamsSubject: Subject<InvStatusMqttMessageParams> = new Subject<InvStatusMqttMessageParams>();
  private readonly pdParamsSubject: Subject<PdStatusMqttMessageParams> = new Subject<PdStatusMqttMessageParams>();
  public bmsParams$ = this.bmsParamsSubject.asObservable();
  public invParams$ = this.invParamsSubject.asObservable();
  public pdParams$ = this.pdParamsSubject.asObservable();

  constructor(private httpApi: EcoFlowHttpApi, private log: Logging) {}

  public async destroy(): Promise<void> {
    await this.client?.unsubscribeAsync('#');
    this.log.debug('Unsubscribed from all topics');

    await this.client?.end();
    this.log.info('Disconnected from EcoFlow MQTT Service');
  }

  public async subscribe(topicPattern: string, serialNumber: string): Promise<void> {
    const client = await this.connect();
    const topic = this.composeTopic(topicPattern, serialNumber);
    await client.subscribeAsync(topic);
    this.log.debug('Subscribed to topic:', topic);
    client.on('message', (_, message) => {
      const mqttMessage = JSON.parse(message.toString()) as MqttMessage<MqttMessageParams>;
      this.processMqttMessage(mqttMessage);
    });
  }

  public async publish(topicPattern: string, serialNumber: string, data: MqttSetMessageBase): Promise<void> {
    const client = await this.connect();
    const topic = this.composeTopic(topicPattern, serialNumber);
    const message = JSON.stringify(data);
    await client.publishAsync(topic, message);
    this.log.debug(`Published to topic '${topic}'`, message);
  }

  public processMqttMessage(message: MqttMessage<MqttMessageParams>): void {
    if (message.typeCode === MqttMessageType.BMS) {
      const params = message.params as BmsStatusMqttMessageParams;
      this.log.debug('BMS:', params);
      this.bmsParamsSubject.next(params);
    } else if (message.typeCode === MqttMessageType.INV) {
      const params = message.params as InvStatusMqttMessageParams;
      this.log.debug('INV:', params);
      this.invParamsSubject.next(params);
    } else if (message.typeCode === MqttMessageType.PD) {
      const params = message.params as PdStatusMqttMessageParams;
      this.log.debug('PD:', params);
      this.pdParamsSubject.next(params);
    }
  }

  private async connect(): Promise<mqtt.MqttClient> {
    if (!this.client) {
      const certificateData = await this.acquireCertificate();
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
    return this.client;
  }

  private async acquireCertificate(): Promise<AcquireCertificateResponseData> {
    if (!this.certificateData) {
      this.certificateData = await this.httpApi.acquireCertificate();
    }
    return this.certificateData;
  }

  private composeTopic(topicPattern: string, serialNumber: string): string {
    return topicPattern
      .replace('<certificateAccount>', this.certificateData!.certificateAccount)
      .replace('<sn>', serialNumber);
  }
}
