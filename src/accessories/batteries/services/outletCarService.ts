import { EcoFlowAccessory } from '@ecoflow/accessories/ecoFlowAccessory';
import { MqttSetEnabledMessageParams, OutletServiceBase } from '@ecoflow/services/outletServiceBase';

export class OutletCarService extends OutletServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessory) {
    super('CAR', ecoFlowAccessory.config.battery?.additionalCharacteristics, ecoFlowAccessory);
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
