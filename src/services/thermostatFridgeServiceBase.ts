import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic, CharacteristicValue } from 'homebridge';

enum TargetHeaterCoolerStateType {
  Off = 0,
  Heat = 1,
  Cool = 2,
}

enum TargetHeatingCoolingStateType {
  Off = 0,
  Heat = 1,
  Cool = 2,
  Auto = 3,
}

export enum TemperatureDisplayUnitsType {
  Celsius = 0,
  Fahrenheit = 1,
}

export enum CoolerStateType {
  Off = 0,
  Cool = 2,
}

export abstract class ThermostatFridgeServiceBase extends ServiceBase {
  private currentTargetTemperature: number = 0;
  private currentTargetState: CoolerStateType = CoolerStateType.Off;
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

  public updateCurrentState(value: CoolerStateType): void {
    this.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, 'Current State', value);
  }

  public updateTargetState(value: CoolerStateType): void {
    this.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, 'Target State', value);
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

  protected abstract processOnSetTargetState(value: CoolerStateType, revert: () => void): Promise<void>;

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

  private addCurrentHeatingCoolingStateCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState).setProps({
      validValues: [TargetHeaterCoolerStateType.Off, TargetHeaterCoolerStateType.Cool],
    });
    return characteristic;
  }

  private addTargetHeatingCoolingStateCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState).setProps({
      validValues: [TargetHeatingCoolingStateType.Off, TargetHeatingCoolingStateType.Cool],
    });
    characteristic.onSet((value: CharacteristicValue) => {
      const prevTargetState = this.currentTargetState;
      this.currentTargetState = value as CoolerStateType;
      this.processOnSetTargetState(this.currentTargetState, () => this.updateTargetState(prevTargetState));
    });
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
