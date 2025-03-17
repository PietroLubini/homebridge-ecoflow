import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic, CharacteristicValue } from 'homebridge';

export abstract class SwitchXboostServiceBase extends ServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(ecoFlowAccessory.platform.Service.Switch, ecoFlowAccessory, 'X-Boost');
  }

  public updateState(state: boolean): void {
    this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  }

  protected override addCharacteristics(): Characteristic[] {
    const onCharacteristic = this.addCharacteristic(this.platform.Characteristic.On);
    onCharacteristic.onSet((value: CharacteristicValue) => {
      const newValue = value as boolean;
      this.setOn(newValue, () => this.updateState(!newValue));
    });
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return [onCharacteristic];
  }

  protected abstract setOn(value: boolean, revert: () => void): Promise<void>;
}
