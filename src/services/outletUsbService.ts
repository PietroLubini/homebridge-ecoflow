import { EcoFlowAccessory } from '../accessories/ecoFlowAccessory.js';
import { MqttSetEnabledMessageParams, OutletsServiceBase } from './outletServiceBase.js';

export class OutletUsbService extends OutletsServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessory) {
    super('USB', ecoFlowAccessory);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<MqttSetEnabledMessageParams>(1, 'dcOutCfg', { enabled: Number(value) }, revert);
  }
}
