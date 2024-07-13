import { PlatformAccessory } from 'homebridge';

import { EcoFlowHomebridgePlatform } from '../platform.js';
import { EcoFlowAccessory } from './ecoFlowAccessory.js';
import { DeviceConfig } from '../config.js';
import { EcoFlowBatteryService } from './services/ecoFlowBatteryService.js';

export class Delta2MaxAccessory extends EcoFlowAccessory {
  constructor(platform: EcoFlowHomebridgePlatform, accessory: PlatformAccessory, config: DeviceConfig) {
    super(platform, accessory, config);
    new EcoFlowBatteryService(accessory, platform, config);
  }
}