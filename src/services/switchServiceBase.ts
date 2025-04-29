import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic, CharacteristicValue } from 'homebridge';

export abstract class SwitchServiceBase extends ServiceBase {
  private state: boolean = false;

  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, serviceSubType: string) {
    super(ecoFlowAccessory.platform.Service.Switch, ecoFlowAccessory, serviceSubType);
  }

  public updateState(state: boolean): void {
    this.state = state;
    this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  }

  protected override onDisabled(): void {
    this.updateState(false);
  }

  protected override addCharacteristics(): Characteristic[] {
    const onCharacteristic = this.addCharacteristic(this.platform.Characteristic.On)
      .onGet(() => this.processOnGet(this.state))
      .onSet((value: CharacteristicValue) =>
        this.processOnSet(this.platform.Characteristic.On.name, () => {
          this.state = value as boolean;
          this.processOnSetOn(this.state, () => this.updateState(!this.state));
        })
      );

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return [onCharacteristic];
  }

  protected abstract processOnSetOn(value: boolean, revert: () => void): Promise<void>;
}
