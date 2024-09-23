import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic } from 'homebridge';

export class BatteryStatusService extends ServiceBase {
  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryBase,
    serviceSubType?: string
  ) {
    super(ecoFlowAccessory.platform.Service.Battery, ecoFlowAccessory, serviceSubType);
  }

  protected override addCharacteristics(): Characteristic[] {
    return [
      this.addCharacteristic(this.platform.Characteristic.StatusLowBattery),
      this.addCharacteristic(this.platform.Characteristic.BatteryLevel),
      this.addCharacteristic(this.platform.Characteristic.ChargingState),
    ];
  }

  public updateBatteryLevel(batteryLevel: number): void {
    this.updateCharacteristic(this.platform.Characteristic.BatteryLevel, 'BatteryLevel', batteryLevel);
    this.updateStatusLowBattery(batteryLevel);
  }

  public updateChargingState(chargingPower: number): void {
    const isCharging = chargingPower > 0;
    this.updateCharacteristic(this.platform.Characteristic.ChargingState, 'ChargingState', isCharging);
  }

  private updateStatusLowBattery(batteryLevel: number): void {
    const statusLowBattery =
      batteryLevel < 20
        ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
        : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    this.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, 'StatusLowBattery', statusLowBattery);
  }
}
