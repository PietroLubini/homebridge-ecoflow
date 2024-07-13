import { PlatformAccessory } from 'homebridge';
import { EcoFlowHomebridgePlatform } from '../platform.js';
import { DeviceConfig } from '../config.js';

export class EcoFlowAccessory {
  constructor(
    private readonly platform: EcoFlowHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly config: DeviceConfig,
  ) {
      this.accessory
        .getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'EcoFlow')
        .setCharacteristic(this.platform.Characteristic.Model, this.config.model)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.config.serialNumber);
  }
}