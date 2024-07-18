import { MqttSetEnabledMessageParams } from 'accessories/apis/interfaces/ecoFlowMqttContacts.js';
import { OutletsServiceBase } from './outletServiceBase.js';
import { EcoFlowAccessory } from 'accessories/ecoFlowAccessory.js';

export class OutletCarService extends OutletsServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessory) {
    super('CAR', ecoFlowAccessory);
  }

  protected override setOn(value: boolean): Promise<void> {
    return this.publishEnabled<MqttSetEnabledMessageParams>(5, 'mpptCar', { enabled: Number(value) });
  }
}
