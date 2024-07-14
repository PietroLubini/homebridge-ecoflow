import { PlatformAccessory } from 'homebridge';

import { EcoFlowHomebridgePlatform } from '../platform.js';
import { EcoFlowAccessory } from './ecoFlowAccessory.js';
import { DeviceConfig } from '../config.js';
import { BatteryService } from './services/batteryService.js';
import { OutletsService } from './services/outletsService.js';
import { ServiceBase } from './services/serviceBase.js';
import { EcoFlowMqttApi } from './apis/ecoFlowMqttApi.js';

export class Delta2MaxAccessory extends EcoFlowAccessory {
  protected override registerServices(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    api: EcoFlowMqttApi
  ): ServiceBase[] {
    const result = [];

    result.push(new BatteryService(accessory, platform, config, api));
    result.push(new OutletsService(accessory, platform, config, api));

    return result;
  }
}
