import { DeltaProAllQuotaData } from '@ecoflow/accessories/batteries/deltapro/interfaces/deltaProHttpApiContracts';
import { DeltaProMqttSetAcOnMessageParams } from '@ecoflow/accessories/batteries/deltapro/interfaces/deltaProMqttApiContracts';
import { DeltaProOutletServiceBase } from '@ecoflow/accessories/batteries/deltapro/services/deltaProOutletServiceBase';
import { AcEnableType, AcXBoostType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';

export class OutletAcService extends DeltaProOutletServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<DeltaProAllQuotaData>) {
    super(ecoFlowAccessory, 'AC', ecoFlowAccessory.config.battery?.additionalCharacteristics);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<DeltaProMqttSetAcOnMessageParams>(
      {
        cmdSet: 32,
        id: 66,
        xboost: AcXBoostType.Ignore,
        enabled: value ? AcEnableType.On : AcEnableType.Off,
      },
      revert
    );
  }
}
