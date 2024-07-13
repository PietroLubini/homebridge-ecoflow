import { Logging, PlatformAccessory } from 'homebridge';
import { DeviceConfig } from '../../config.js';
import { EcoFlowApi } from '../apis/ecoFlowApi.js';
import { EcoFlowHomebridgePlatform } from 'platform.js';

export abstract class ServiceBase {
  protected readonly api: EcoFlowApi;
  protected readonly log: Logging;

  constructor(protected accessory: PlatformAccessory, protected platform: EcoFlowHomebridgePlatform, protected config: DeviceConfig) {
    this.log = platform.log;
    this.api = new EcoFlowApi(config, this.log);
  }
}