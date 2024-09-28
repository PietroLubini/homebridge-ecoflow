import { EcoFlowCharacteristic } from '@ecoflow/platform';

export class BatteryStatusProvider {
  public getStatusLowBattery(
    characteristic: EcoFlowCharacteristic,
    batteryLevel: number,
    dischargeLimit: number
  ): number {
    return batteryLevel < dischargeLimit + 5
      ? characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
      : characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
  }
}
