import { PlatformAccessory } from 'homebridge';

import { EcoFlowHomebridgePlatform } from '../platform.js';
import { EcoFlowAccessory } from './ecoFlowAccessory.js';
import { DeviceConfig } from '../config.js';
import { BatteryService } from './services/batteryService.js';
import { OutputsService } from './services/outputsService.js';

export class Delta2MaxAccessory extends EcoFlowAccessory {
  constructor(platform: EcoFlowHomebridgePlatform, accessory: PlatformAccessory, config: DeviceConfig) {
    super(platform, accessory, config);
    new BatteryService(accessory, platform, config);
    new OutputsService(accessory, platform, config);
  }
}