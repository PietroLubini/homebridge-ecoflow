import { Logging, PlatformAccessory } from 'homebridge';
import { EcoFlowHomebridgePlatform } from '../platform.js';
import { DeviceConfig } from '../config.js';
import { ServiceBase } from './services/serviceBase.js';
import { EcoFlowMqttApi } from './apis/ecoFlowMqttApi.js';
import { AccessoryInformationService } from './services/accessoryInformationService.js';
import { EcoFlowHttpApi } from './apis/ecoFlowHttpApi.js';
import { CmdResponseData } from './apis/interfaces/ecoFlowHttpContacts.js';
import { Subscription } from 'rxjs';

export abstract class EcoFlowAccessory {
  public readonly log: Logging;
  public readonly mqttApi: EcoFlowMqttApi;
  protected readonly httpApi: EcoFlowHttpApi;
  private services: ServiceBase[] = [];
  private reconnectMqttTimeoutId: NodeJS.Timeout | null = null;
  private isMqttConnected: boolean = false;
  private subscriptions: Subscription[] = [];

  constructor(
    public readonly platform: EcoFlowHomebridgePlatform,
    public readonly accessory: PlatformAccessory,
    public readonly config: DeviceConfig
  ) {
    this.log = this.platform.log;
    this.httpApi = new EcoFlowHttpApi(this.config, this.log);
    this.mqttApi = new EcoFlowMqttApi(this.httpApi, this.log);
  }

  public async initialize(): Promise<void> {
    this.services = this.createServices();
    this.services.push(new AccessoryInformationService(this));
    // await this.connectMqtt();
    this.initializeServices();
    this.subscriptions = this.subscribeOnParameterUpdates();
  }

  public destroy() {
    if (this.reconnectMqttTimeoutId !== null) {
      clearTimeout(this.reconnectMqttTimeoutId);
      this.reconnectMqttTimeoutId = null;
    }
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  protected abstract createServices(): ServiceBase[];

  protected abstract subscribeOnParameterUpdates(): Subscription[];

  private initializeServices(): void {
    this.services.forEach(service => {
      service.initialize();
    });
    this.cleanupServices();
  }

  private cleanupServices(): void {
    const services = this.services.map(service => service.service);
    this.accessory.services
      .filter(service => !services.includes(service))
      .forEach(service => {
        this.platform.log.info(`Removing obsolete service from accessory '${this.config.name}':`, service.displayName);
        this.accessory.removeService(service);
      });
  }

  private async connectMqtt(): Promise<void> {
    await this.initMqtt();
    this.reconnectMqttTimeoutId = setInterval(async () => {
      // Check MQTT is connected every minute
      if (!this.isMqttConnected) {
        await this.initMqtt();
      }
    }, 60 * 1000);
  }

  private async initMqtt(): Promise<void> {
    try {
      await this.mqttApi.subscribe('/open/<certificateAccount>/<sn>/quota', this.config.serialNumber);
      this.isMqttConnected = true;
    } catch (e) {
      if (e instanceof Error) {
        this.log.error(e.message);
      }
    }
  }
}

export abstract class EcoFlowAccessoryWithQuota<
  TGetQuotasCmdResponseData extends CmdResponseData
> extends EcoFlowAccessory {
  private _initialData: TGetQuotasCmdResponseData | null = null;

  // Getter for service
  protected get initialData(): TGetQuotasCmdResponseData {
    if (!this._initialData) {
      throw new Error('Initial data is not received');
    }
    return this._initialData;
  }

  public override async initialize(): Promise<void> {
    if (!this._initialData) {
      this._initialData = await this.httpApi.getAllQuotas<TGetQuotasCmdResponseData>();
    }
    await super.initialize();
  }
}
