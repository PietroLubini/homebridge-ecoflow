import { DeltaProUltraAllQuotaData } from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraHttpApiContracts';
import {
  DeltaProUltraMqttSetCmdCodeType,
  DeltaProUltraMqttSetOnMessageParams,
} from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraMqttApiContracts';
import { DeltaProUltraOutletServiceBase } from '@ecoflow/accessories/batteries/deltaproultra/services/deltaProUltraOutletServiceBase';
import { AcEnableType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { CharacteristicPermsType } from '@ecoflow/characteristics/characteristicContracts';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';

export class OutletUsbService extends DeltaProUltraOutletServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<DeltaProUltraAllQuotaData>, batteryStatusProvider: BatteryStatusProvider) {
    super(
      ecoFlowAccessory,
      batteryStatusProvider,
      'USB',
      CharacteristicPermsType.DEFAULT,
      ecoFlowAccessory.config.battery?.additionalCharacteristics
    );
  }

  protected override processOnSetOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<DeltaProUltraMqttSetOnMessageParams>(
      DeltaProUltraMqttSetCmdCodeType.YJ751_PD_DC_SWITCH_SET,
      {
        enabled: value ? AcEnableType.On : AcEnableType.Off,
      },
      revert
    );
  }
}
