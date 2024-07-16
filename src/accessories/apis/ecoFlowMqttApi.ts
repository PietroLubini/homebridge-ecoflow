import mqtt, { MqttClient } from 'mqtt';
import { v4 as uuidV4 } from 'uuid';
import { CmdResponse, EcoFlowApiBase } from './ecoFlowApiBase.js';
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

interface AcquireCertificateResponseData {
  certificateAccount: string;
  certificatePassword: string;
  url: string;
  port: string;
  protocol: string;
}

interface AcquireCertificateResponse extends CmdResponse<AcquireCertificateResponseData> {}

const CertificateRelativePath = '/iot-open/sign/certification';

export class EcoFlowMqttApi extends EcoFlowApiBase {
  private client: MqttClient | null = null;
  private certificateData: AcquireCertificateResponseData | null = null;
  private readonly bmsParamsSubject: Subject<BmsStatusMqttMessageParams> = new Subject<BmsStatusMqttMessageParams>();
  private readonly invParamsSubject: Subject<InvStatusMqttMessageParams> = new Subject<InvStatusMqttMessageParams>();
  private readonly pdParamsSubject: Subject<PdStatusMqttMessageParams> = new Subject<PdStatusMqttMessageParams>();
  public bmsParams$ = this.bmsParamsSubject.asObservable();
  public invParams$ = this.invParamsSubject.asObservable();
  public pdParams$ = this.pdParamsSubject.asObservable();

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
    client.on('message', (_, message) => this.processMqttMessage(message));
  }

  public async publish(topicPattern: string, serialNumber: string, data: MqttSetMessageBase): Promise<void> {
    const client = await this.connect();
    const topic = this.composeTopic(topicPattern, serialNumber);
    const message = JSON.stringify(data);
    await client.publishAsync(topic, message);
    this.log.debug(`Published to topic '${topic}'`, message);
  }

  private async connect(): Promise<mqtt.MqttClient> {
    if (!this.client) {
      const certificateData = await this.acquireCertificate();
      this.client = await mqtt.connectAsync(
        `${certificateData.protocol}://${certificateData.url}:${certificateData.port}`,
        {
          username: `${certificateData.certificateAccount}`,
          password: `${certificateData.certificatePassword}`,
          clientId: `HOMEBRIDGE_${uuidV4().toUpperCase()}`,
          protocolVersion: 5,
        }
      );
      this.log.info('Connected to EcoFlow MQTT Service');
    }
    return this.client;
  }

  private async acquireCertificate(): Promise<AcquireCertificateResponseData> {
    if (!this.certificateData) {
      this.log.debug('Acquire certificate for MQTT connection');
      const response = await this.execute<AcquireCertificateResponse>(CertificateRelativePath, 'GET');
      this.certificateData = response.data;
      this.log.debug('Certificate data:', this.certificateData);
    }
    return this.certificateData;
  }

  private processMqttMessage(message: Buffer): void {
    const mqttMessage = JSON.parse(message.toString()) as MqttMessage<MqttMessageParams>;
    if (mqttMessage.typeCode === MqttMessageType.BMS) {
      const params = mqttMessage.params as BmsStatusMqttMessageParams;
      this.log.debug('BMS:', params);
      this.bmsParamsSubject.next(params);
    } else if (mqttMessage.typeCode === MqttMessageType.INV) {
      const params = mqttMessage.params as InvStatusMqttMessageParams;
      this.log.debug('INV:', params);
      this.invParamsSubject.next(params);
    } else if (mqttMessage.typeCode === MqttMessageType.PD) {
      const params = mqttMessage.params as PdStatusMqttMessageParams;
      this.log.debug('PD:', params);
      this.pdParamsSubject.next(params);
    }
  }

  private composeTopic(topicPattern: string, serialNumber: string): string {
    return topicPattern
      .replace('<certificateAccount>', this.certificateData!.certificateAccount)
      .replace('<sn>', serialNumber);
  }
}
