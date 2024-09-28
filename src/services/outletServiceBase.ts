import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { AdditionalBatteryCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic, CharacteristicValue, WithUUID } from 'homebridge';

export abstract class OutletServiceBase extends ServiceBase {
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryBase,
    private readonly batteryStatusProvider: BatteryStatusProvider,
    serviceSubType: string,
    private readonly additionalCharacteristics?: CharacteristicType[]
  ) {
    super(ecoFlowAccessory.platform.Service.Outlet, ecoFlowAccessory, serviceSubType);
  }

  public updateState(state: boolean): void {
    this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  }

  public updateOutputConsumption(watt: number): void {
    this.updateCharacteristic(this.platform.Characteristic.OutletInUse, 'InUse', watt > 0);
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.OutputConsumptionWatts,
      'Output Consumption, W',
      () => watt,
      CharacteristicType.OutputConsumptionInWatts
    );
  }

  public updateInputConsumption(watt: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.InputConsumptionWatts,
      'Input Consumption, W',
      () => watt,
      CharacteristicType.InputConsumptionInWatts
    );
  }

  public updateBatteryLevel(batteryLevel: number, dischargeLimit: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.BatteryLevel,
      'Battery Level, %',
      () => batteryLevel,
      CharacteristicType.BatteryLevel
    );
    this.updateStatusLowBattery(batteryLevel, dischargeLimit);
  }

  public updateChargingState(chargingPower: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.ChargingState,
      'ChargingState',
      () => chargingPower > 0,
      CharacteristicType.ChargingState
    );
  }

  protected override addCharacteristics(): Characteristic[] {
    const onCharacteristic = this.addCharacteristic(this.platform.Characteristic.On);
    onCharacteristic.onSet(value => {
      const newValue = value as boolean;
      this.setOn(newValue, () => this.updateState(!newValue));
    });

    const characteristics = [
      this.addCharacteristic(this.platform.Characteristic.OutletInUse),
      onCharacteristic,
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.PowerConsumption.InputConsumptionWatts,
        CharacteristicType.InputConsumptionInWatts
      ),
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.PowerConsumption.OutputConsumptionWatts,
        CharacteristicType.OutputConsumptionInWatts
      ),
      this.tryAddCustomCharacteristic(this.platform.Characteristic.BatteryLevel, CharacteristicType.BatteryLevel),
      this.tryAddCustomCharacteristic(this.platform.Characteristic.ChargingState, CharacteristicType.ChargingState),
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.StatusLowBattery,
        CharacteristicType.StatusLowBattery
      ),
    ];
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return characteristics.filter(characteristic => characteristic !== null);
  }

  protected abstract setOn(value: boolean, revert: () => void): Promise<void>;

  private updateStatusLowBattery(batteryLevel: number, dischargeLimit: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.StatusLowBattery,
      'StatusLowBattery',
      () => this.batteryStatusProvider.getStatusLowBattery(this.platform.Characteristic, batteryLevel, dischargeLimit),
      CharacteristicType.StatusLowBattery
    );
  }

  private tryAddCustomCharacteristic(
    characteristic: WithUUID<{ new (): Characteristic }>,
    characteristicType: CharacteristicType
  ): Characteristic | null {
    if (this.additionalCharacteristics?.includes(characteristicType)) {
      return this.addCharacteristic(characteristic);
    }
    return null;
  }

  private updateCustomCharacteristic(
    characteristic: WithUUID<{ new (): Characteristic }>,
    name: string,
    valueFunc: () => CharacteristicValue,
    characteristicType: CharacteristicType
  ): void {
    if (this.additionalCharacteristics?.includes(characteristicType)) {
      this.updateCharacteristic(characteristic, name, valueFunc());
    }
  }
}
