import { DeltaPro3AllQuotaData } from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3HttpApiContracts';
import { DeltaPro3MqttSetAcLvMessageParams } from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3MqttApiContracts';
import { DeltaPro3OutletServiceBase } from '@ecoflow/accessories/batteries/deltapro3/services/deltaPro3OutletServiceBase';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';

export class OutletAcLvService extends DeltaPro3OutletServiceBase {
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<DeltaPro3AllQuotaData>,
    batteryStatusProvider: BatteryStatusProvider
  ) {
    super(ecoFlowAccessory, batteryStatusProvider, 'AC LV', ecoFlowAccessory.config.battery?.additionalCharacteristics);
  }

  protected override processOnSetOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<DeltaPro3MqttSetAcLvMessageParams>(
      {
        cfgLvAcOutOpen: value,
      },
      revert
    );
  }
}
