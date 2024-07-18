import { MqttSetAcEnabledMessageParams } from 'accessories/apis/interfaces/ecoFlowMqttContacts.js';
import { OutletsServiceBase } from './outletServiceBase.js';
import { EcoFlowAccessory } from 'accessories/ecoFlowAccessory.js';

export class OutletAcService extends OutletsServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessory) {
    super('AC', ecoFlowAccessory);
  }

  protected override setOn(value: boolean): Promise<void> {
    return this.publishEnabled<MqttSetAcEnabledMessageParams>(3, 'acOutCfg', {
      out_voltage: 4294967295,
      out_freq: 1,
      xboost: Number(true),
      enabled: Number(value),
    });
  }

  public updateState(state: boolean): void {
    this.log.debug('AcState ->', state);
    this.service.getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.On).updateValue(state);
  }

  public updateInUse(isInUse: boolean): void {
    this.log.debug('AcInUse ->', isInUse);
    this.service.getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.OutletInUse).updateValue(isInUse);
  }
}
