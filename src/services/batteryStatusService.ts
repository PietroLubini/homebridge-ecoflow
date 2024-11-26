import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic } from 'homebridge';

export class BatteryStatusService extends ServiceBase {
  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryBase,
    private readonly batteryStatusProvider: BatteryStatusProvider,
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

  public updateBatteryLevel(batteryLevel: number, dischargeLimit: number): void {
    this.updateCharacteristic(this.platform.Characteristic.BatteryLevel, 'BatteryLevel', batteryLevel);
    this.updateStatusLowBattery(batteryLevel, dischargeLimit);
  }

  public updateChargingState(isCharging: boolean): void {
    this.updateCharacteristic(this.platform.Characteristic.ChargingState, 'ChargingState', isCharging);
  }

  private updateStatusLowBattery(batteryLevel: number, dischargeLimit: number): void {
    const statusLowBattery = this.batteryStatusProvider.getStatusLowBattery(
      this.platform.Characteristic,
      batteryLevel,
      dischargeLimit
    );
    this.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, 'StatusLowBattery', statusLowBattery);
  }
}
