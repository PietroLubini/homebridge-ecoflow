import { EcoFlowAccessoryWithQuota } from '@ecoflow/accessories/ecoFlowAccessory';
import { PowerStreamAllQuotaData } from '@ecoflow/accessories/powerstream/interfaces/httpApiPowerStreamContracts';
import { AdditionalBatteryCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';

export class OutletService extends OutletServiceBase {
  constructor(
    serviceSubType: string,
    additionalCharacteristics: CharacteristicType[] | undefined,
    protected readonly ecoFlowAccessory: EcoFlowAccessoryWithQuota<PowerStreamAllQuotaData>
  ) {
    super(serviceSubType, additionalCharacteristics, ecoFlowAccessory);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public override updateState(state: boolean): void {
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
  }

  protected override setOn(): Promise<void> {
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
  }
}
