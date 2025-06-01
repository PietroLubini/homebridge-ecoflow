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
      .onSet((value: CharacteristicValue) => {
        this.processOnSetVerify(this.platform.Characteristic.On.name);
        const revert = () => this.updateState(!value);
        this.processOnSet(async () => {
          this.state = value as boolean;
          await this.processOnSetOn(this.state, revert);
        }, revert);
      });

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return [onCharacteristic];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected processOnSetOn(value: boolean, revert: () => void): Promise<void> {
    return Promise.resolve();
  }
}
