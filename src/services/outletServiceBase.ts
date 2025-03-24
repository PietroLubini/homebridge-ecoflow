import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { AdditionalOutletCharacteristicType as OutletCharacteristicType } from '@ecoflow/config';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic, CharacteristicValue, WithUUID } from 'homebridge';

export abstract class OutletServiceBase extends ServiceBase {
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryBase,
    private readonly additionalCharacteristics?: string[],
    serviceSubType?: string
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
      OutletCharacteristicType.OutputConsumptionInWatts
    );
  }

  public updateOutputVoltage(volt: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.OutputVoltage,
      'Output Voltage, V',
      () => volt,
      OutletCharacteristicType.OutputVoltage
    );
    this.updateOutputConsumptionKilowattHour();
  }

  public updateOutputCurrent(miliAmpere: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.OutputCurrent,
      'Output Current, A',
      () => miliAmpere,
      OutletCharacteristicType.OutputCurrent
    );
    this.updateOutputConsumptionKilowattHour();
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
        this.platform.Characteristic.PowerConsumption.OutputVoltage,
        OutletCharacteristicType.OutputVoltage
      ),
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.PowerConsumption.OutputCurrent,
        OutletCharacteristicType.OutputCurrent
      ),
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.PowerConsumption.OutputConsumptionWatts,
        OutletCharacteristicType.OutputConsumptionInWatts
      ),
      this.tryAddCustomDependentCharacteristic(
        this.platform.Characteristic.PowerConsumption.OutputConsumptionKilowattHour,
        OutletCharacteristicType.OutputCurrent,
        OutletCharacteristicType.OutputVoltage
      ),
    ];
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return characteristics.filter(characteristic => characteristic !== null);
  }

  protected abstract setOn(value: boolean, revert: () => void): Promise<void>;

  protected tryAddCustomDependentCharacteristic(
    characteristic: WithUUID<{ new (): Characteristic }>,
    ...characteristicTypes: string[]
  ): Characteristic | null {
    if (OutletServiceBase.intersect(this.additionalCharacteristics ?? [], characteristicTypes).length > 0) {
      return this.addCharacteristic(characteristic);
    }
    return null;
  }

  protected tryAddCustomCharacteristic(
    characteristic: WithUUID<{ new (): Characteristic }>,
    characteristicType: string
  ): Characteristic | null {
    if (this.additionalCharacteristics?.includes(characteristicType)) {
      return this.addCharacteristic(characteristic);
    }
    return null;
  }

  protected updateCustomDependentCharacteristic(
    characteristic: WithUUID<{ new (): Characteristic }>,
    name: string,
    valueFunc: () => CharacteristicValue,
    ...characteristicTypes: string[]
  ): void {
    if (OutletServiceBase.intersect(this.additionalCharacteristics ?? [], characteristicTypes).length > 0) {
      this.updateCharacteristic(characteristic, name, valueFunc());
    }
  }

  protected updateCustomCharacteristic(
    characteristic: WithUUID<{ new (): Characteristic }>,
    name: string,
    valueFunc: () => CharacteristicValue,
    characteristicType: string
  ): void {
    if (this.additionalCharacteristics?.includes(characteristicType)) {
      this.updateCharacteristic(characteristic, name, valueFunc());
    }
  }

  private static intersect<T>(arr1: T[], arr2: T[]): T[] {
    const set2 = new Set(arr2);
    return arr1.filter(item => set2.has(item));
  }

  private updateOutputConsumptionKilowattHour(): void {
    this.updateCustomDependentCharacteristic(
      this.platform.Characteristic.PowerConsumption.OutputConsumptionKilowattHour,
      'Output Consumption, kW/h',
      () => 0,
      OutletCharacteristicType.OutputCurrent,
      OutletCharacteristicType.OutputVoltage
    );
  }
}
