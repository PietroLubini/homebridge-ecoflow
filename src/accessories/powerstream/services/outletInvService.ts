import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { AdditionalBatteryCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';

export class OutletInvService extends OutletServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, additionalCharacteristics?: CharacteristicType[]) {
    super(ecoFlowAccessory, 'INV', additionalCharacteristics);
  }

  protected override setOn(): Promise<void> {
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
  }
}
