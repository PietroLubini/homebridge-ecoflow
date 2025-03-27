import { DeltaProAllQuotaData } from '@ecoflow/accessories/batteries/deltapro/interfaces/deltaProHttpApiContracts';
import {
  DeltaProMqttSetAcOnMessageParams,
  DeltaProMqttSetMessageParams,
  DeltaProMqttSetMessageWithParams,
} from '@ecoflow/accessories/batteries/deltapro/interfaces/deltaProMqttApiContracts';
import { AcEnableType, AcXBoostType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { SwitchServiceBase } from '@ecoflow/services/switchServiceBase';

export class SwitchXboostService extends SwitchServiceBase {
  constructor(protected readonly ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<DeltaProAllQuotaData>) {
    super(ecoFlowAccessory, 'X-Boost');
  }

  protected setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<DeltaProMqttSetAcOnMessageParams>(
      {
        cmdSet: 32,
        id: 66,
        xboost: value ? AcXBoostType.On : AcXBoostType.Off,
        enabled: AcEnableType.Ignore,
      },
      revert
    );
  }

  private sendOn<TParams extends DeltaProMqttSetMessageParams>(params: TParams, revert: () => void): Promise<void> {
    const message: DeltaProMqttSetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      operateType: 'TCP',
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
