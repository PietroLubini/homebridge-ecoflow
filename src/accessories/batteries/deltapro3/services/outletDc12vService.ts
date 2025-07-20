import { DeltaPro3AllQuotaData } from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3HttpApiContracts';
import { DeltaPro3MqttSetDc12vMessageParams } from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3MqttApiContracts';
import { DeltaPro3OutletServiceBase } from '@ecoflow/accessories/batteries/deltapro3/services/deltaPro3OutletServiceBase';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { CharacteristicPermsType } from '@ecoflow/characteristics/characteristicExtensions';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';

export class OutletDc12vService extends DeltaPro3OutletServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<DeltaPro3AllQuotaData>, batteryStatusProvider: BatteryStatusProvider) {
    super(
      ecoFlowAccessory,
      batteryStatusProvider,
      'DC 12V',
      CharacteristicPermsType.DEFAULT,
      ecoFlowAccessory.config.battery?.additionalCharacteristics
    );
  }

  protected override processOnSetOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<DeltaPro3MqttSetDc12vMessageParams>(
      {
        cfgDc12vOutOpen: value,
      },
      revert
    );
  }
}
