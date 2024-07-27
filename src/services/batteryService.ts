import { Service } from 'homebridge';
import { ServiceBase } from './serviceBase.js';

export class BatteryService extends ServiceBase {
  protected override createService(): Service {
    const service =
      this.ecoFlowAccessory.accessory.getService(this.platform.Service.Battery) ||
      this.ecoFlowAccessory.accessory.addService(this.platform.Service.Battery, this.ecoFlowAccessory.config.name);
    return service;
  }

  public updateStatusLowBattery(batteryLevel: number): void {
    const statusLowBattery = batteryLevel < 20;
    this.log.debug('Status Low Battery ->', statusLowBattery);
    this.service
      .getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .updateValue(
        statusLowBattery
          ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
          : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
      );
  }

  public updateBatteryLevel(batteryLevel: number): void {
    this.log.debug('BatteryLevel ->', batteryLevel);
    this.service.getCharacteristic(this.platform.Characteristic.BatteryLevel).updateValue(batteryLevel);
  }

  public updateChargingState(chargingPower: number): void {
    const isCharging = chargingPower > 0;
    this.log.debug('ChargingState ->', isCharging);
    this.service.getCharacteristic(this.platform.Characteristic.ChargingState).updateValue(isCharging);
  }
}
