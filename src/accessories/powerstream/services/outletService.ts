import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { PowerStreamAllQuotaData } from '@ecoflow/accessories/powerstream/interfaces/powerStreamHttpApiContracts';
import { AdditionalBatteryCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';

export class OutletService extends OutletServiceBase {
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<PowerStreamAllQuotaData>,
    serviceSubType: string,
    additionalCharacteristics?: CharacteristicType[]
  ) {
    super(ecoFlowAccessory, serviceSubType, additionalCharacteristics);
  }

  protected override setOn(): Promise<void> {
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
  }
}
