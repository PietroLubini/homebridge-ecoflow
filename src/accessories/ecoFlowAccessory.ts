import { Logging, PlatformAccessory } from 'homebridge';
import { EcoFlowHomebridgePlatform } from '../platform.js';
import { DeviceConfig } from '../config.js';
import { ServiceBase } from './services/serviceBase.js';
import { EcoFlowMqttApi } from './apis/ecoFlowMqttApi.js';
import { AccessoryInformationService } from './services/accessoryInformationService.js';

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
    this.services = this.registerServices(this.platform, this.accessory, this.config, this.api);
    this.services.push(new AccessoryInformationService(this.accessory, this.platform, this.config, this.api));
    this.initServices();
    // this.connectMqtt();
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

  private initServices(): void {
    this.services.forEach(service => {
      service.init();
    });
    this.cleanupServices();
  }

  private cleanupServices(): void {
    const services = this.services.map(service => service.service);
    this.accessory.services
      .filter(service => !services.includes(service))
      .forEach(service => {
        this.platform.log.debug(`Removing obsolete service from accessory '${this.config.name}':`, service.displayName);
        this.accessory.removeService(service);
      });
  }

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
