import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { PowerStreamAllQuotaData } from '@ecoflow/accessories/powerstream/interfaces/powerStreamHttpApiContracts';
import { AdditionalBatteryCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { OutletBatteryServiceBase } from '@ecoflow/services/outletBatteryServiceBase';

export class OutletService extends OutletBatteryServiceBase {
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<PowerStreamAllQuotaData>,
    batteryStatusProvider: BatteryStatusProvider,
    serviceSubType: string,
    additionalCharacteristics?: CharacteristicType[]
  ) {
    super(ecoFlowAccessory, batteryStatusProvider, serviceSubType, additionalCharacteristics);
  }

  protected override processOnSetOn(): Promise<void> {
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
  }
}
