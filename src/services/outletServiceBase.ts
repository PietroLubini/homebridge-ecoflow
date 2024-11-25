import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { AdditionalBatteryCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic, CharacteristicValue, WithUUID } from 'homebridge';

export abstract class OutletServiceBase extends ServiceBase {
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryBase,
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
      watt,
      CharacteristicType.OutputConsumptionInWatts
    );
  }

  public updateInputConsumption(watt: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.InputConsumptionWatts,
      'Input Consumption, W',
      watt,
      CharacteristicType.InputConsumptionInWatts
    );
  }

  public updateBatteryLevel(batteryLevel: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.BatteryLevel,
      'Battery Level, %',
      batteryLevel,
      CharacteristicType.BatteryLevel
    );
  }

  protected override addCharacteristics(): Characteristic[] {
    const onCharacteristic = this.addCharacteristic(this.platform.Characteristic.On);
    onCharacteristic.onSet((value: CharacteristicValue) => {
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
    ];
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return characteristics.filter(characteristic => characteristic !== null);
  }

  protected abstract setOn(value: boolean, revert: () => void): Promise<void>;

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
    value: CharacteristicValue,
    characteristicType: CharacteristicType
  ): void {
    if (this.additionalCharacteristics?.includes(characteristicType)) {
      this.updateCharacteristic(characteristic, name, value);
    }
  }
}
