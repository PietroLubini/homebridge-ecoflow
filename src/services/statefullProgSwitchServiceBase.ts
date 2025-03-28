import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic } from 'homebridge';

export class StatefulProgSwitchService extends ServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, serviceSubType: string) {
    super(ecoFlowAccessory.platform.Service.StatefulProgrammableSwitch, ecoFlowAccessory, serviceSubType);
  }

  // public updateState(state: boolean): void {
  //   this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  // }

  protected override addCharacteristics(): Characteristic[] {
    const characteristics = [
      this.addCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent),
      this.addCharacteristic(this.platform.Characteristic.ProgrammableSwitchOutputState),
      this.addCharacteristic(this.platform.Characteristic.ServiceLabelIndex).onGet(() => 2),
    ];
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return characteristics;
  }

  // protected abstract setOn(value: boolean, revert: () => void): Promise<void>;
}
