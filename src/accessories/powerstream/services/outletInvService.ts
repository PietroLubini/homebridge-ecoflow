import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { AdditionalBatteryCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { OutletBatteryServiceBase } from '@ecoflow/services/outletBatteryServiceBase';

export class OutletInvService extends OutletBatteryServiceBase {
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryBase,
    batteryStatusProvider: BatteryStatusProvider,
    additionalCharacteristics?: CharacteristicType[]
  ) {
    super(ecoFlowAccessory, batteryStatusProvider, 'INV', additionalCharacteristics);
  }

  protected override processOnSetOn(): Promise<void> {
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
  }
}
