import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic } from 'homebridge';

export class ThermostatService extends ServiceBase {
  private minTemperature: number = -20;
  private maxTemperature: number = 10;

  constructor(ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(ecoFlowAccessory.platform.Service.Thermostat, ecoFlowAccessory, 'Fridge');
  }

  // public updateState(state: boolean): void {
  //   this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  // }

  protected override addCharacteristics(): Characteristic[] {
    const currentTemperature = this.addCharacteristic(this.platform.Characteristic.CurrentTemperature).setProps({
      minValue: this.minTemperature,
      maxValue: this.maxTemperature,
      minStep: 0.1,
    });
    const targetTemperature = this.addCharacteristic(this.platform.Characteristic.TargetTemperature).setProps({
      minValue: this.minTemperature,
      maxValue: this.maxTemperature,
      minStep: 0.1,
    });
    const currentHeatingCoolingState = this.addCharacteristic(
      this.platform.Characteristic.CurrentHeatingCoolingState
    ).setProps({ validValues: [0, 2] }); // Only allow Off and Cool
    const targetHeatingCoolingState = this.addCharacteristic(
      this.platform.Characteristic.TargetHeatingCoolingState
    ).setProps({ minValue: 0, maxValue: 2, validValues: [0, 2] }); // Only allow Off and Cool;
    const temperatureDisplayUnits = this.addCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits);
    // onCharacteristic.onSet((value: CharacteristicValue) => {
    //   const newValue = value as boolean;
    //   this.setOn(newValue, () => this.updateState(!newValue));
    // });
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return [
      currentTemperature,
      targetTemperature,
      currentHeatingCoolingState,
      targetHeatingCoolingState,
      temperatureDisplayUnits,
    ];
  }

  // protected abstract setOn(value: boolean, revert: () => void): Promise<void>;
}
