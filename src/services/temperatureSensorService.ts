import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic } from 'homebridge';

export class TemperatureSensorService extends ServiceBase {
  private temperatureCharacteristic: Characteristic | null = null;

  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryBase,
    serviceSubType?: string
  ) {
    super(ecoFlowAccessory.platform.Service.TemperatureSensor, ecoFlowAccessory, serviceSubType);
  }

  protected override addCharacteristics(): Characteristic[] {
    this.temperatureCharacteristic = this.addCharacteristic(this.platform.Characteristic.CurrentTemperature);
    return [this.temperatureCharacteristic];
  }

  public updateCurrentTemperature(value: number): void {
    this.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, 'Current Temperature', value);
  }
}
