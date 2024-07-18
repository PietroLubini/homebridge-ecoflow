import { MqttSetEnabledMessageParams } from 'accessories/apis/interfaces/ecoFlowMqttContacts.js';
import { OutletsServiceBase } from './outletServiceBase.js';
import { EcoFlowAccessory } from 'accessories/ecoFlowAccessory.js';

export class OutletUsbService extends OutletsServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessory) {
    super('USB', ecoFlowAccessory);
  }

  protected override setOn(value: boolean): Promise<void> {
    return this.publishEnabled<MqttSetEnabledMessageParams>(1, 'dcOutCfg', { enabled: Number(value) });
  }
}
