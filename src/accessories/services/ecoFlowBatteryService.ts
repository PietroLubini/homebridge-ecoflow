import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { EcoFlowService } from './ecoflowService.js';
import { DeviceConfig } from '../../config.js';
import { EcoFlowHomebridgePlatform } from 'platform.js';

export class EcoFlowBatteryService extends EcoFlowService {
  private readonly service: Service;

  constructor(accessory: PlatformAccessory, platform: EcoFlowHomebridgePlatform, config: DeviceConfig) {
    super(accessory, platform, config);

    this.service = this.accessory.getService(this.platform.Service.Battery) || this.accessory.addService(this.platform.Service.Battery);
    this.init();
  }

  protected init(): void {
    this.service
      .getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .onGet(this.getStatusLowBattery.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.BatteryLevel)
      .onGet(this.getBatteryLevel.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.ChargingState)
      .onGet(this.getChargingState.bind(this));
  }

  async getStatusLowBattery(): Promise<CharacteristicValue> {
    const statusLowBattery = await this.api.isLowBattery();
    this.log.debug('Status Low Battery ->', statusLowBattery);
    return statusLowBattery ?
      this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW :
      this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
  }

  async getBatteryLevel(): Promise<CharacteristicValue> {
    const batteryLevel = await this.api.getBatteryLevel();
    this.log.debug('BatteryLevel ->', batteryLevel);
    return batteryLevel;
  }

  async getChargingState(): Promise<CharacteristicValue> {
    const isCharging = await this.api.isBatteryCharging();
    this.log.debug('ChargingState ->', isCharging);
    return isCharging;
  }
}
