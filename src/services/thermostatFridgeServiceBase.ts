import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import {
  CurrentHeatingCoolingStateType,
  FridgeStateType,
  TargetHeatingCoolingStateType,
  TemperatureDisplayUnitsType,
} from '@ecoflow/characteristics/characteristicContracts';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic, CharacteristicValue } from 'homebridge';

export abstract class ThermostatFridgeServiceBase extends ServiceBase {
  private currentTemperature: number = 0;
  private targetTemperature: number = 0;
  private currentHeatingCoolingStateType: CurrentHeatingCoolingStateType = CurrentHeatingCoolingStateType.Off;
  private targetHeatingCoolingStateType: TargetHeatingCoolingStateType = TargetHeatingCoolingStateType.Off;
  private targetFridgeState: FridgeStateType = FridgeStateType.Off;
  private temperatureDisplayUnits: number = 0;

  constructor(
    ecoFlowAccessory: EcoFlowAccessoryBase,
    private readonly minTemperature: number,
    private readonly maxTemperature: number,
    serviceSubType: string
  ) {
    super(ecoFlowAccessory.platform.Service.Thermostat, ecoFlowAccessory, serviceSubType);
  }

  public updateCurrentTemperature(value: number): void {
    this.currentTemperature = value;
    this.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, 'Current Temperature', value);
  }

  public updateTargetTemperature(value: number): void {
    this.targetTemperature = value;
    this.updateCharacteristic(this.platform.Characteristic.TargetTemperature, 'Target Temperature', value);
  }

  public updateCurrentState(value: FridgeStateType): void {
    this.currentHeatingCoolingStateType =
      value === FridgeStateType.On ? CurrentHeatingCoolingStateType.Cool : CurrentHeatingCoolingStateType.Off;
    this.updateCharacteristic(
      this.platform.Characteristic.CurrentHeatingCoolingState,
      'Current State',
      this.currentHeatingCoolingStateType
    );
  }

  public updateTargetState(value: FridgeStateType): void {
    this.targetHeatingCoolingStateType =
      value === FridgeStateType.On ? TargetHeatingCoolingStateType.Cool : TargetHeatingCoolingStateType.Off;
    this.updateCharacteristic(
      this.platform.Characteristic.TargetHeatingCoolingState,
      'Target State',
      this.targetHeatingCoolingStateType
    );
  }

  public updateTemperatureDisplayUnits(value: TemperatureDisplayUnitsType): void {
    this.temperatureDisplayUnits = value;
    this.updateCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits, 'Temperature Display Units', value);
  }

  protected override addCharacteristics(): Characteristic[] {
    const characteristics = [
      this.addCurrentTemperatureCharacteristic(),
      this.addTargetTemperatureCharacteristic(),
      this.addCurrentHeatingCoolingStateCharacteristic(),
      this.addTargetHeatingCoolingStateCharacteristic(),
      this.addTemperatureDisplayUnitsCharacteristic(),
    ];
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return characteristics;
  }

  protected abstract processOnSetTargetTemperature(value: number, revert: () => void): Promise<void>;

  protected abstract processOnSetTargetState(value: FridgeStateType, revert: () => void): Promise<void>;

  protected abstract processOnSetTemperatureDisplayUnits(
    value: TemperatureDisplayUnitsType,
    revert: () => void
  ): Promise<void>;

  private addCurrentTemperatureCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature,
        minStep: 0.1,
      })
      .onGet(() => this.processOnGet(this.currentTemperature));
    return characteristic;
  }

  private addTargetTemperatureCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature,
        minStep: 0.1,
      })
      .onGet(() => this.processOnGet(this.targetTemperature))
      .onSet((value: CharacteristicValue) =>
        this.processOnSet(this.platform.Characteristic.TargetTemperature.name, () => {
          const prevTargetTemperature = this.targetTemperature;
          this.targetTemperature = value as number;
          this.processOnSetTargetTemperature(this.targetTemperature, () =>
            this.updateTargetTemperature(prevTargetTemperature)
          );
        })
      );
    return characteristic;
  }

  private addCurrentHeatingCoolingStateCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .setProps({
        validValues: [TargetHeatingCoolingStateType.Off, TargetHeatingCoolingStateType.Cool],
      })
      .onGet(() => this.processOnGet(this.currentHeatingCoolingStateType));
    return characteristic;
  }

  private addTargetHeatingCoolingStateCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .setProps({
        validValues: [TargetHeatingCoolingStateType.Off, TargetHeatingCoolingStateType.Cool],
      })
      .onGet(() => this.processOnGet(this.targetHeatingCoolingStateType))
      .onSet((value: CharacteristicValue) =>
        this.processOnSet(this.platform.Characteristic.TargetHeatingCoolingState.name, () => {
          this.targetHeatingCoolingStateType = value as TargetHeatingCoolingStateType;
          const prevTargetFridgeState = this.targetFridgeState;
          this.targetFridgeState =
            this.targetHeatingCoolingStateType === TargetHeatingCoolingStateType.Cool
              ? FridgeStateType.On
              : FridgeStateType.Off;
          this.processOnSetTargetState(this.targetFridgeState, () => this.updateTargetState(prevTargetFridgeState));
        })
      );
    return characteristic;
  }

  private addTemperatureDisplayUnitsCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(() => this.processOnGet(this.temperatureDisplayUnits))
      .onSet((value: CharacteristicValue) =>
        this.processOnSet(this.platform.Characteristic.TemperatureDisplayUnits.name, () => {
          const prevTemperatureDisplayUnits = this.temperatureDisplayUnits;
          this.temperatureDisplayUnits = value as TemperatureDisplayUnitsType;
          this.processOnSetTemperatureDisplayUnits(this.temperatureDisplayUnits, () =>
            this.updateTemperatureDisplayUnits(prevTemperatureDisplayUnits)
          );
        })
      );
    return characteristic;
  }
}
