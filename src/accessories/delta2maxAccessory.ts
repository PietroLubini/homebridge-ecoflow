import { PlatformAccessory } from 'homebridge';

import { EcoFlowHomebridgePlatform } from '../platform.js';
import { EcoFlowAccessory } from './ecoFlowAccessory.js';
import { DeviceConfig } from '../config.js';
import { BatteryService } from './services/batteryService.js';
import { ServiceBase } from './services/serviceBase.js';
import { EcoFlowMqttApi } from './apis/ecoFlowMqttApi.js';
import { OutletUsbService } from './services/outletUsbService.js';
import { OutletCarService } from './services/outletCarService.js';
import { OutletAcService } from './services/outletAcService.js';

export class Delta2MaxAccessory extends EcoFlowAccessory {
  protected override registerServices(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    api: EcoFlowMqttApi
  ): ServiceBase[] {
    const result: ServiceBase[] = [];

    result.push(new BatteryService(accessory, platform, config, api));
    result.push(new OutletUsbService(accessory, platform, config, api));
    result.push(new OutletAcService(accessory, platform, config, api));
    result.push(new OutletCarService(accessory, platform, config, api));

    return result;
  }
}
