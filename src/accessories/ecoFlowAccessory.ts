import { Logging, PlatformAccessory } from 'homebridge';
import { EcoFlowHomebridgePlatform } from '../platform.js';
import { DeviceConfig } from '../config.js';
import { ServiceBase } from './services/serviceBase.js';
import { EcoFlowMqttApi } from './apis/ecoFlowMqttApi.js';

export abstract class EcoFlowAccessory {
  private readonly services: ServiceBase[];
  private readonly log: Logging;
  private readonly api: EcoFlowMqttApi;
  private connectMqttTimeoutId: NodeJS.Timeout | null = null;
  private reconnectMqttTimeoutId: NodeJS.Timeout | null = null;
  private isMqttConnected: boolean = false;

  constructor(
    private readonly platform: EcoFlowHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly config: DeviceConfig
  ) {
    this.log = this.platform.log;
    this.api = new EcoFlowMqttApi(this.config, this.platform.log);
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'EcoFlow')
      .setCharacteristic(this.platform.Characteristic.Model, this.config.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.config.serialNumber);

    this.services = this.registerServices(this.platform, this.accessory, this.config, this.api);
    this.connectMqtt();
  }

  destroy() {
    if (this.connectMqttTimeoutId !== null) {
      clearTimeout(this.connectMqttTimeoutId);
      this.connectMqttTimeoutId = null;
    }
    if (this.reconnectMqttTimeoutId !== null) {
      clearTimeout(this.reconnectMqttTimeoutId);
      this.reconnectMqttTimeoutId = null;
    }
  }

  protected abstract registerServices(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    api: EcoFlowMqttApi
  ): ServiceBase[];

  private connectMqtt(): void {
    this.connectMqttTimeoutId = setTimeout(async () => await this.initMqtt(), 500);
    this.reconnectMqttTimeoutId = setInterval(async () => {
      // Check MQTT is connected every minute
      if (!this.isMqttConnected) {
        await this.initMqtt();
      }
    }, 60 * 1000);
  }

  private async initMqtt(): Promise<void> {
    try {
      await this.api.subscribe('/open/<certificateAccount>/<sn>/quota', this.config.serialNumber);
      this.isMqttConnected = true;
    } catch (e) {
      if (e instanceof Error) {
        this.log.error(e.message);
      }
    }
  }
}
