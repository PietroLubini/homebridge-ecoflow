import { Logging, PlatformAccessory, Service } from 'homebridge';
import { DeviceConfig } from '../../config.js';
import { EcoFlowHomebridgePlatform } from 'platform.js';
import { EcoFlowMqttApi } from 'accessories/apis/ecoFlowMqttApi.js';
import { Subscription } from 'rxjs';

export abstract class ServiceBase {
  protected readonly log: Logging;
  private _service: Service | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    protected accessory: PlatformAccessory,
    protected platform: EcoFlowHomebridgePlatform,
    protected config: DeviceConfig,
    protected api: EcoFlowMqttApi
  ) {
    this.log = platform.log;
  }

  public destroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  public init(): void {
    this._service = this.createService();
    this.subscriptions = this.subscribe(this.api);
  }

  // Getter for service
  public get service(): Service {
    if (!this._service) {
      throw new Error('Service is not initialized');
    }
    return this._service;
  }

  protected abstract createService(): Service;

  protected abstract subscribe(api: EcoFlowMqttApi): Subscription[];
}
