import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic, CharacteristicValue } from 'homebridge';

export abstract class SwitchServiceBase extends ServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, serviceSubType: string) {
    super(ecoFlowAccessory.platform.Service.Switch, ecoFlowAccessory, serviceSubType);
  }

  public updateState(state: boolean): void {
    this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  }

  protected override onDisabled(): void {
    this.updateState(false);
  }

  protected override addCharacteristics(): Characteristic[] {
    const onCharacteristic = this.addCharacteristic(this.platform.Characteristic.On);
    this.addCharacteristicSet(onCharacteristic, 'On', (value: CharacteristicValue) => {
      const newValue = value as boolean;
      this.setOn(newValue, () => this.updateState(!newValue));
    });

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return [onCharacteristic];
  }

  protected abstract setOn(value: boolean, revert: () => void): Promise<void>;
}
