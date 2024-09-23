import { EcoFlowAccessory } from '@ecoflow/accessories/ecoFlowAccessory';
import { MqttSetEnabledMessageParams, OutletServiceBase } from '@ecoflow/services/outletServiceBase';

export class OutletUsbService extends OutletServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessory) {
    super('USB', ecoFlowAccessory);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<MqttSetEnabledMessageParams>(1, 'dcOutCfg', { enabled: Number(value) }, revert);
  }
}