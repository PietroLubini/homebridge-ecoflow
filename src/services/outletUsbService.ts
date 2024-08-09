import { EcoFlowAccessory } from '../accessories/ecoFlowAccessory';
import { MqttSetEnabledMessageParams, OutletsServiceBase } from './outletServiceBase';

export class OutletUsbService extends OutletsServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessory) {
    super('USB', ecoFlowAccessory);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<MqttSetEnabledMessageParams>(1, 'dcOutCfg', { enabled: Number(value) }, revert);
  }
}
