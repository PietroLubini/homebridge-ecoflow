import {
  AcEnableType,
  AcOutFrequencyType,
  AcOutVoltageIgnore,
  AcXBoostType,
  Delta2AllQuotaData,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2HttpApiContracts';
import {
  Delta2MqttSetAcOnMessageParams,
  Delta2MqttSetModuleType,
  Delta2MqttSetOperationType,
  MqttDelta2SetMessageWithParams,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2MqttApiContracts';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { SwitchXboostServiceBase } from '@ecoflow/services/switchXboostServiceBase';

export class SwitchXboostService extends SwitchXboostServiceBase {
  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<Delta2AllQuotaData>,
    private readonly setAcModuleType: Delta2MqttSetModuleType
  ) {
    super(ecoFlowAccessory);
  }

  protected setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<Delta2MqttSetAcOnMessageParams>(
      this.setAcModuleType,
      Delta2MqttSetOperationType.AcOutCfg,
      {
        out_voltage: AcOutVoltageIgnore,
        out_freq: AcOutFrequencyType.Ignore,
        xboost: value ? AcXBoostType.On : AcXBoostType.Off,
        enabled: AcEnableType.Ignore,
      },
      revert
    );
  }

  private sendOn<TParams>(
    moduleType: Delta2MqttSetModuleType,
    operateType: Delta2MqttSetOperationType,
    params: TParams,
    revert: () => void
  ): Promise<void> {
    const message: MqttDelta2SetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      moduleType,
      operateType,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
