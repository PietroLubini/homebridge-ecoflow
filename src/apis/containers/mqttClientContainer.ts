import { MqttDevice } from '@ecoflow/apis/containers/mqttDevice';
import { AcquireCertificateData } from '@ecoflow/apis/interfaces/httpApiContracts';
import { DeviceInfoConfig, SerialNumber } from '@ecoflow/config';
import { Logging } from 'homebridge';
import mqtt from 'mqtt';

export class MqttClientContainer {
  private _client: mqtt.MqttClient | null = null;
  private readonly devicesCache: Record<SerialNumber, MqttDevice[]> = {};

  constructor(public readonly certificateData: AcquireCertificateData) {}

  public get client(): mqtt.MqttClient | null {
    return this._client;
  }

  public set client(new_client: mqtt.MqttClient) {
    if (this._client === null) {
      this._client = new_client;
    }
  }

  public isConnected(): boolean {
    return !!this.client;
  }

  public getDevices(serialNumber?: SerialNumber): MqttDevice[] {
    if (serialNumber && serialNumber in this.devicesCache) {
      return this.devicesCache[serialNumber];
    }
    return [];
  }

  public addDevice(config: DeviceInfoConfig, log: Logging): void {
    if (!(config.serialNumber in this.devicesCache)) {
      this.devicesCache[config.serialNumber] = [];
    }
    this.devicesCache[config.serialNumber].push(new MqttDevice(config, log));
  }

  public getAllDevices(): MqttDevice[] {
    const allDevices: MqttDevice[] = [];
    for (const serialNumber in this.devicesCache) {
      const devices = this.devicesCache[serialNumber];
      allDevices.push(...devices);
    }
    return allDevices;
  }
}
