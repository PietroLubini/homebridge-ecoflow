import { EcoFlowAccessory } from '../ecoFlowAccessory.js';
import { MqttSetEnabledMessageParams, OutletsServiceBase } from './outletServiceBase.js';

export class OutletCarService extends OutletsServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessory) {
    super('CAR', ecoFlowAccessory);
  }

  protected override setOn(value: boolean): Promise<void> {
    return this.sendOn<MqttSetEnabledMessageParams>(5, 'mpptCar', { enabled: Number(value) });
  }
}
