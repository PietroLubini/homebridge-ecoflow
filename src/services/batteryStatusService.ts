import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic, Service } from 'homebridge';

export class BatteryStatusService extends ServiceBase {
  protected override createService(): Service {
    return this.getOrAddService(this.platform.Service.Battery, this.ecoFlowAccessory.config.name);
  }

  protected override addCharacteristics(): Characteristic[] {
    return [
      this.addCharacteristic(this.platform.Characteristic.StatusLowBattery),
      this.addCharacteristic(this.platform.Characteristic.BatteryLevel),
      this.addCharacteristic(this.platform.Characteristic.ChargingState),
    ];
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
