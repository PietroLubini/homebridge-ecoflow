import { EcoFlowAccessory } from '../accessories/ecoFlowAccessory.js';
import { MqttSetEnabledMessageParams, OutletsServiceBase } from './outletServiceBase.js';

export class OutletCarService extends OutletsServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessory) {
    super('CAR', ecoFlowAccessory);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<MqttSetEnabledMessageParams>(
      5,
      'mpptCar',
      {
        enabled: Number(value),
      },
      revert
    );
  }
}
