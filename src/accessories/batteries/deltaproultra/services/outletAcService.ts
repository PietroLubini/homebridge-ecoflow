import { DeltaProUltraAllQuotaData } from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraHttpApiContracts';
import { DeltaProUltraOutletServiceBase } from '@ecoflow/accessories/batteries/deltaproultra/services/deltaProUltraOutletServiceBase';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';

export class OutletAcService extends DeltaProUltraOutletServiceBase {
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<DeltaProUltraAllQuotaData>,
    batteryStatusProvider: BatteryStatusProvider
  ) {
    super(ecoFlowAccessory, batteryStatusProvider, 'AC', ecoFlowAccessory.config.battery?.additionalCharacteristics);
  }

  protected override setOn(): Promise<void> {
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
  }
}
