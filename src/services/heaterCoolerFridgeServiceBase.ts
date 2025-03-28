import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import {
  CurrenttHeaterCoolerStateType,
  FridgeStateType,
  TargetHeaterCoolerStateType,
  TemperatureDisplayUnitsType,
} from '@ecoflow/characteristics/characteristicContracts';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic, CharacteristicValue } from 'homebridge';

export abstract class HeaterCoolerFridgeServiceBase extends ServiceBase {
  private currentTargetTemperature: number = 0;
  // private currentTargetFridgeState: FridgeStateType = FridgeStateType.Off;
  private currentTemperatureDisplayUnits: number = 0;

  constructor(
    ecoFlowAccessory: EcoFlowAccessoryBase,
    private readonly minTemperature: number,
    private readonly maxTemperature: number,
    serviceSubType: string
  ) {
    super(ecoFlowAccessory.platform.Service.HeaterCooler, ecoFlowAccessory, serviceSubType);
  }

  public updateCurrentTemperature(value: number): void {
    this.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, 'Current Temperature', value);
  }

  public updateTargetTemperature(value: number): void {
    this.updateCharacteristic(this.platform.Characteristic.TargetTemperature, 'Target Temperature', value);
  }

  public updateCurrentState(value: FridgeStateType): void {
    this.updateCharacteristic(
      this.platform.Characteristic.CurrentHeaterCoolerState,
      'Current State',
      value === FridgeStateType.On ? CurrenttHeaterCoolerStateType.Cooling : CurrenttHeaterCoolerStateType.Inactive
    );
  }

  public updateTargetState(value: FridgeStateType): void {
    this.updateCharacteristic(
      this.platform.Characteristic.TargetHeaterCoolerState,
      'Target State',
      value === FridgeStateType.On ? TargetHeaterCoolerStateType.Cool : TargetHeaterCoolerStateType.Auto
    );
  }

  public updateTemperatureDisplayUnits(value: TemperatureDisplayUnitsType): void {
    this.updateCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits, 'Temperature Display Units', value);
  }

  protected override addCharacteristics(): Characteristic[] {
    const characteristics = [
      this.addCurrentTemperatureCharacteristic(),
      this.addTargetTemperatureCharacteristic(),
      this.addCurrentHeaterCoolerStateCharacteristic(),
      this.addTargetHeaterCoolerStateCharacteristic(),
      this.addTemperatureDisplayUnitsCharacteristic(),
    ];
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return characteristics;
  }

  protected abstract processOnSetTargetTemperature(value: number, revert: () => void): Promise<void>;

  // protected abstract processOnSetTargetState(value: FridgeStateType, revert: () => void): Promise<void>;

  protected abstract processOnSetTemperatureDisplayUnits(
    value: TemperatureDisplayUnitsType,
    revert: () => void
  ): Promise<void>;

  private addCurrentTemperatureCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.CurrentTemperature).setProps({
      minValue: this.minTemperature,
      maxValue: this.maxTemperature,
      minStep: 0.1,
    });
    return characteristic;
  }

  private addTargetTemperatureCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.TargetTemperature).setProps({
      minValue: this.minTemperature,
      maxValue: this.maxTemperature,
      minStep: 0.1,
    });
    characteristic.onSet((value: CharacteristicValue) => {
      const prevTargetTemperature = this.currentTargetTemperature;
      this.currentTargetTemperature = value as number;
      this.processOnSetTargetTemperature(this.currentTargetTemperature, () =>
        this.updateTargetTemperature(prevTargetTemperature)
      );
    });
    return characteristic;
  }

  private addCurrentHeaterCoolerStateCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState).setProps({
      // validValues: [CurrenttHeaterCoolerStateType.Inactive, CurrenttHeaterCoolerStateType.Cooling],
    });
    return characteristic;
  }

  private addTargetHeaterCoolerStateCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState).setProps({
      // validValues: [TargetHeaterCoolerStateType.Cool],
    });
    // characteristic.onSet((value: CharacteristicValue) => {
    //   const prevTargetState = this.currentTargetState;
    //   this.currentTargetState = value as CoolerStateType;
    //   this.processOnSetTargetState(this.currentTargetState, () => this.updateTargetState(prevTargetState));
    // });
    return characteristic;
  }

  private addTemperatureDisplayUnitsCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits);
    characteristic.onSet((value: CharacteristicValue) => {
      const prevTemperatureDisplayUnits = this.currentTemperatureDisplayUnits;
      this.currentTemperatureDisplayUnits = value as TemperatureDisplayUnitsType;
      this.processOnSetTemperatureDisplayUnits(this.currentTemperatureDisplayUnits, () =>
        this.updateTemperatureDisplayUnits(prevTemperatureDisplayUnits)
      );
    });
    return characteristic;
  }
}
