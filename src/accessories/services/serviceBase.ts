import { Logging, PlatformAccessory } from 'homebridge';
import { DeviceConfig } from '../../config.js';
import { EcoFlowHomebridgePlatform } from 'platform.js';
import { EcoFlowMqttApi } from 'accessories/apis/ecoFlowMqttApi.js';
import { Subscription } from 'rxjs';

export abstract class ServiceBase {
  protected readonly log: Logging;
  private readonly subscriptions: Subscription[];

  constructor(
    protected accessory: PlatformAccessory,
    protected platform: EcoFlowHomebridgePlatform,
    protected config: DeviceConfig,
    api: EcoFlowMqttApi
  ) {
    this.log = platform.log;
    this.subscriptions = this.subscribe(api);
  }

  public destroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  protected abstract subscribe(api: EcoFlowMqttApi): Subscription[];
}
