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
  private currentTargetTemperature: number = 0;
  private currentTargetFridgeState: FridgeStateType = FridgeStateType.Off;
  private currentTemperatureDisplayUnits: number = 0;

  constructor(
    ecoFlowAccessory: EcoFlowAccessoryBase,
    private readonly minTemperature: number,
    private readonly maxTemperature: number,
    serviceSubType: string
  ) {
    super(ecoFlowAccessory.platform.Service.Thermostat, ecoFlowAccessory, serviceSubType);
  }

  public updateCurrentTemperature(value: number): void {
    this.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, 'Current Temperature', value);
  }

  public updateTargetTemperature(value: number): void {
    this.updateCharacteristic(this.platform.Characteristic.TargetTemperature, 'Target Temperature', value);
  }

  public updateCurrentState(value: FridgeStateType): void {
    this.updateCharacteristic(
      this.platform.Characteristic.CurrentHeatingCoolingState,
      'Current State',
      value === FridgeStateType.On ? CurrentHeatingCoolingStateType.Cool : CurrentHeatingCoolingStateType.Off
    );
  }

  public updateTargetState(value: FridgeStateType): void {
    this.updateCharacteristic(
      this.platform.Characteristic.TargetHeatingCoolingState,
      'Target State',
      value === FridgeStateType.On ? TargetHeatingCoolingStateType.Cool : TargetHeatingCoolingStateType.Off
    );
  }

  public updateTemperatureDisplayUnits(value: TemperatureDisplayUnitsType): void {
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
    this.addCharacteristicSet(characteristic, 'TargetTemperature', (value: CharacteristicValue) => {
      const prevTargetTemperature = this.currentTargetTemperature;
      this.currentTargetTemperature = value as number;
      this.processOnSetTargetTemperature(this.currentTargetTemperature, () =>
        this.updateTargetTemperature(prevTargetTemperature)
      );
    });
    return characteristic;
  }

  private addCurrentHeatingCoolingStateCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState).setProps({
      validValues: [TargetHeatingCoolingStateType.Off, TargetHeatingCoolingStateType.Cool],
    });
    return characteristic;
  }

  private addTargetHeatingCoolingStateCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState).setProps({
      validValues: [TargetHeatingCoolingStateType.Off, TargetHeatingCoolingStateType.Cool],
    });
    this.addCharacteristicSet(characteristic, 'TargetHeatingCoolingState', (value: CharacteristicValue) => {
      const prevTargetFridgeState = this.currentTargetFridgeState;
      this.currentTargetFridgeState =
        (value as TargetHeatingCoolingStateType) === TargetHeatingCoolingStateType.Cool
          ? FridgeStateType.On
          : FridgeStateType.Off;
      this.processOnSetTargetState(this.currentTargetFridgeState, () => this.updateTargetState(prevTargetFridgeState));
    });
    return characteristic;
  }

  private addTemperatureDisplayUnitsCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits);
    this.addCharacteristicSet(characteristic, 'TemperatureDisplayUnits', (value: CharacteristicValue) => {
      const prevTemperatureDisplayUnits = this.currentTemperatureDisplayUnits;
      this.currentTemperatureDisplayUnits = value as TemperatureDisplayUnitsType;
      this.processOnSetTemperatureDisplayUnits(this.currentTemperatureDisplayUnits, () =>
        this.updateTemperatureDisplayUnits(prevTemperatureDisplayUnits)
      );
    });
    return characteristic;
  }
}
