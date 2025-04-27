import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic } from 'homebridge';

export class TemperatureSensorService extends ServiceBase {
  private currentTemperature: number = 0;

  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryBase,
    serviceSubType?: string
  ) {
    super(ecoFlowAccessory.platform.Service.TemperatureSensor, ecoFlowAccessory, serviceSubType);
  }

  protected override addCharacteristics(): Characteristic[] {
    const temperatureCharacteristic = this.addCharacteristic(this.platform.Characteristic.CurrentTemperature);
    temperatureCharacteristic.onGet(() => this.processOnGet(this.currentTemperature));
    return [temperatureCharacteristic];
  }

  public updateCurrentTemperature(value: number): void {
    this.currentTemperature = value;
    this.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, 'Current Temperature', value);
  }
}
