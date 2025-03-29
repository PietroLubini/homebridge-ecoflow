import {
  AcOutFrequencyType,
  DeltaProUltraAllQuotaData,
} from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraHttpApiContracts';
import {
  DeltaProUltraMqttSetCmdCodeType,
  DeltaProUltraMqttSetMessageParams,
  DeltaProUltraMqttSetMessageWithParams,
  DeltaProUltraMqttSetXBoostMessageParams,
} from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraMqttApiContracts';
import { AcXBoostType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { SwitchServiceBase } from '@ecoflow/services/switchServiceBase';

export class SwitchXboostService extends SwitchServiceBase {
  constructor(protected readonly ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<DeltaProUltraAllQuotaData>) {
    super(ecoFlowAccessory, 'X-Boost');
  }

  protected setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<DeltaProUltraMqttSetXBoostMessageParams>(
      DeltaProUltraMqttSetCmdCodeType.YJ751_PD_AC_DSG_SET,
      {
        xboost: value ? AcXBoostType.On : AcXBoostType.Off,
        outFreq: AcOutFrequencyType.None,
      },
      revert
    );
  }

  private sendOn<TParams extends DeltaProUltraMqttSetMessageParams>(
    cmdCode: DeltaProUltraMqttSetCmdCodeType,
    params: TParams,
    revert: () => void
  ): Promise<void> {
    const message: DeltaProUltraMqttSetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      cmdCode,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
