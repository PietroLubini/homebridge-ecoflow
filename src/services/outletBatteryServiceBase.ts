import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import {
  AdditionalBatteryCharacteristicType as BatteryCharacteristicType,
  AdditionalBatteryOutletCharacteristicType as BatteryOutletCharacteristicType,
} from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';
import { Characteristic } from 'homebridge';

export abstract class OutletBatteryServiceBase extends OutletServiceBase {
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryBase,
    private readonly batteryStatusProvider: BatteryStatusProvider,
    serviceSubType: string,
    additionalCharacteristics?: BatteryCharacteristicType[]
  ) {
    super(ecoFlowAccessory, additionalCharacteristics, serviceSubType);
  }

  public updateInputConsumption(watt: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.InputConsumptionWatts,
      'Input Consumption, W',
      () => watt,
      BatteryOutletCharacteristicType.InputConsumptionInWatts
    );
  }

  public updateBatteryLevel(batteryLevel: number, dischargeLimit: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.BatteryLevel,
      'Battery Level, %',
      () => batteryLevel,
      BatteryOutletCharacteristicType.BatteryLevel
    );
    this.updateStatusLowBattery(batteryLevel, dischargeLimit);
  }

  public updateChargingState(isCharging: boolean): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.ChargingState,
      'ChargingState',
      () => isCharging,
      BatteryOutletCharacteristicType.ChargingState
    );
  }

  protected override addCharacteristics(): Characteristic[] {
    const characteristics = super.addCharacteristics();
    const additionalCharacteristics = [
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.PowerConsumption.InputConsumptionWatts,
        BatteryOutletCharacteristicType.InputConsumptionInWatts
      ),
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.BatteryLevel,
        BatteryOutletCharacteristicType.BatteryLevel
      ),
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.ChargingState,
        BatteryOutletCharacteristicType.ChargingState
      ),
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.StatusLowBattery,
        BatteryOutletCharacteristicType.StatusLowBattery
      ),
    ];

    return [...characteristics, ...additionalCharacteristics].filter(characteristic => characteristic !== null);
  }

  private updateStatusLowBattery(batteryLevel: number, dischargeLimit: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.StatusLowBattery,
      'StatusLowBattery',
      () => this.batteryStatusProvider.getStatusLowBattery(this.platform.Characteristic, batteryLevel, dischargeLimit),
      BatteryOutletCharacteristicType.StatusLowBattery
    );
  }
}
