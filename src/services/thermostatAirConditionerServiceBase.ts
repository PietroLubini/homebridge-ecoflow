import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import {
  CurrentHeatingCoolingStateType,
  TargetHeatingCoolingStateType,
  TemperatureDisplayUnitsType,
} from '@ecoflow/characteristics/characteristicContracts';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic, CharacteristicValue } from 'homebridge';

export abstract class ThermostatAirConditionerServiceBase extends ServiceBase {
  private readonly minTemperatureFarenheit: number;
  private readonly maxTemperaturefarenheit: number;
  private currentTemperature: number;
  private targetTemperature: number;
  private currentHeatingCoolingStateType: CurrentHeatingCoolingStateType = CurrentHeatingCoolingStateType.Off;
  private targetHeatingCoolingStateType: TargetHeatingCoolingStateType = TargetHeatingCoolingStateType.Off;
  private temperatureDisplayUnits: TemperatureDisplayUnitsType = TemperatureDisplayUnitsType.Celsius;
  private targetTemperatureCharacteristic?: Characteristic;

  constructor(
    ecoFlowAccessory: EcoFlowAccessoryBase,
    private readonly minTemperatureCelsius: number,
    private readonly maxTemperatureCelsius: number,
    serviceSubType?: string
  ) {
    super(ecoFlowAccessory.platform.Service.Thermostat, ecoFlowAccessory, serviceSubType);
    this.minTemperatureFarenheit = ThermostatAirConditionerServiceBase.celsiusToFahrenheit(this.minTemperatureCelsius);
    this.maxTemperaturefarenheit = ThermostatAirConditionerServiceBase.celsiusToFahrenheit(this.maxTemperatureCelsius);
    this.currentTemperature = this.minTemperatureCelsius;
    this.targetTemperature = this.maxTemperatureCelsius;
  }

  public updateCurrentTemperature(value: number): void {
    this.currentTemperature = value;
    this.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, 'Current Temperature', value);
  }

  public updateTargetTemperature(value: number): void {
    this.targetTemperature = value;
    this.updateCharacteristic(this.platform.Characteristic.TargetTemperature, 'Target Temperature', value);
  }

  public updateCurrentState(value: CurrentHeatingCoolingStateType): void {
    this.currentHeatingCoolingStateType = value;
    this.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, 'Current State', this.currentHeatingCoolingStateType);
  }

  public updateTargetState(value: TargetHeatingCoolingStateType): void {
    this.targetHeatingCoolingStateType = value;
    this.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, 'Target State', this.targetHeatingCoolingStateType);
  }

  public updateTemperatureDisplayUnits(value: TemperatureDisplayUnitsType): void {
    this.temperatureDisplayUnits = value;
    this.updateCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits, 'Temperature Display Units', value);
    this.updateTargetTemperatureLimits(value);
  }

  protected override addCharacteristics(): Characteristic[] {
    this.targetTemperatureCharacteristic = this.addTargetTemperatureCharacteristic();
    const characteristics = [
      this.addCurrentTemperatureCharacteristic(),
      this.targetTemperatureCharacteristic,
      this.addCurrentHeatingCoolingStateCharacteristic(),
      this.addTargetHeatingCoolingStateCharacteristic(),
      this.addTemperatureDisplayUnitsCharacteristic(),
    ];
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return characteristics;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected processOnSetTargetTemperature(value: number, revert: () => void): Promise<void> {
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected processOnSetTargetState(value: TargetHeatingCoolingStateType, revert: () => void): Promise<void> {
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected processOnSetTemperatureDisplayUnits(value: TemperatureDisplayUnitsType, revert: () => void): Promise<void> {
    return Promise.resolve();
  }

  private static celsiusToFahrenheit(celsius: number): number {
    return (celsius * 9) / 5 + 32;
  }

  private addCurrentTemperatureCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.CurrentTemperature).onGet(() =>
      this.processOnGet(this.currentTemperature)
    );
    return characteristic;
  }

  private addTargetTemperatureCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({ minStep: 0.1 })
      .onGet(() => this.processOnGet(this.targetTemperature))
      .onSet((value: CharacteristicValue) => {
        const prevTargetTemperature = this.targetTemperature;
        const revert = () => this.updateTargetTemperature(prevTargetTemperature);
        this.processOnSet(
          this.platform.Characteristic.TargetTemperature.name,
          async () => {
            this.targetTemperature = value as number;
            await this.processOnSetTargetTemperature(this.targetTemperature, revert);
          },
          revert
        );
      });
    return characteristic;
  }

  private addCurrentHeatingCoolingStateCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .setProps({ validValues: [CurrentHeatingCoolingStateType.Off, CurrentHeatingCoolingStateType.Cool, CurrentHeatingCoolingStateType.Heat] })
      .onGet(() => this.processOnGet(this.currentHeatingCoolingStateType));
    return characteristic;
  }

  private addTargetHeatingCoolingStateCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .setProps({
        validValues: [
          TargetHeatingCoolingStateType.Off,
          TargetHeatingCoolingStateType.Cool,
          TargetHeatingCoolingStateType.Heat,
          TargetHeatingCoolingStateType.Auto,
        ],
      })
      .onGet(() => this.processOnGet(this.targetHeatingCoolingStateType))
      .onSet((value: CharacteristicValue) => {
        const prevTargetHeatingCoolingStateType = this.targetHeatingCoolingStateType;
        const revert = () => this.updateTargetState(prevTargetHeatingCoolingStateType);
        this.processOnSet(
          this.platform.Characteristic.TargetHeatingCoolingState.name,
          async () => {
            this.targetHeatingCoolingStateType = value as TargetHeatingCoolingStateType;
            await this.processOnSetTargetState(this.targetHeatingCoolingStateType, revert);
          },
          revert
        );
      });
    return characteristic;
  }

  private addTemperatureDisplayUnitsCharacteristic(): Characteristic {
    const characteristic = this.addCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(() => this.processOnGet(this.temperatureDisplayUnits))
      .onSet((value: CharacteristicValue) => {
        const prevTemperatureDisplayUnits = this.temperatureDisplayUnits;
        const revert = () => this.updateTemperatureDisplayUnits(prevTemperatureDisplayUnits);
        this.processOnSet(
          this.platform.Characteristic.TemperatureDisplayUnits.name,
          async () => {
            this.temperatureDisplayUnits = value as TemperatureDisplayUnitsType;
            await this.processOnSetTemperatureDisplayUnits(this.temperatureDisplayUnits, revert);
            this.updateTargetTemperatureLimits(this.temperatureDisplayUnits);
          },
          revert
        );
      });
    return characteristic;
  }

  private updateTargetTemperatureLimits(temperatureDisplayUnits: TemperatureDisplayUnitsType): void {
    this.targetTemperatureCharacteristic?.setProps({
      minValue: temperatureDisplayUnits === TemperatureDisplayUnitsType.Celsius ? this.minTemperatureCelsius : this.minTemperatureFarenheit,
      maxValue: temperatureDisplayUnits === TemperatureDisplayUnitsType.Celsius ? this.maxTemperatureCelsius : this.maxTemperaturefarenheit,
    });
  }
}
