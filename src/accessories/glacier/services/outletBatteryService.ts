import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { GlacierAllQuotaData } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { OutletBatteryServiceBase } from '@ecoflow/services/outletBatteryServiceBase';

export class OutletBatteryService extends OutletBatteryServiceBase {
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>,
    batteryStatusProvider: BatteryStatusProvider
  ) {
    super(
      ecoFlowAccessory,
      batteryStatusProvider,
      'Battery',
      ecoFlowAccessory.config.battery?.additionalCharacteristics
    );
  }

  protected override processOnSetOn(): Promise<void> {
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
  }
}
