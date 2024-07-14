import mqtt, { MqttClient } from 'mqtt';
import { v4 as uuidV4 } from 'uuid';
import { CmdResponse, EcoFlowApiBase } from './ecoFlowApiBase.js';
import {
  BmsStatusMqttMessageParams,
  InvStatusMqttMessageParams,
  MqttMessage,
  MqttMessageParams,
  MqttMessageType,
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
    const topic = topicPattern
      .replace('<certificateAccount>', this.certificateData!.certificateAccount)
      .replace('<sn>', serialNumber);
    await client.subscribeAsync(topic);
    this.log.debug('Subscribed to topic:', topic);
    client.on('message', (topic, message) => this.processMqttMessage(message));
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
      this.bmsParamsSubject.next(mqttMessage.params as BmsStatusMqttMessageParams);
    } else if (mqttMessage.typeCode === MqttMessageType.INV) {
      this.invParamsSubject.next(mqttMessage.params as InvStatusMqttMessageParams);
    } else if (mqttMessage.typeCode === MqttMessageType.PD) {
      this.pdParamsSubject.next(mqttMessage.params as PdStatusMqttMessageParams);
    }
  }
}
