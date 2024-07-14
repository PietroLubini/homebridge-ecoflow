import { Logging, PlatformAccessory } from 'homebridge';
import { DeviceConfig } from '../../config.js';
import { EcoFlowHttpApi } from '../apis/ecoFlowHttpApi.js';
import { EcoFlowHomebridgePlatform } from 'platform.js';

export abstract class ServiceBase {
  protected readonly api: EcoFlowHttpApi;
  protected readonly log: Logging;

  constructor(protected accessory: PlatformAccessory, protected platform: EcoFlowHomebridgePlatform, protected config: DeviceConfig) {
    this.log = platform.log;
    this.api = new EcoFlowHttpApi(config, this.log);
  }
}