import { Delta2AllQuotaData } from '@ecoflow/accessories/batteries/delta2/interfaces/delta2HttpApiContracts';
import {
  Delta2MqttSetAcOnMessageParams,
  Delta2MqttSetMessageParams,
  Delta2MqttSetMessageWithParams,
  Delta2MqttSetModuleType,
  Delta2MqttSetOperationType,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2MqttApiContracts';
import {
  AcEnableType,
  AcOutFrequencyType,
  AcOutVoltageIgnore,
  AcXBoostType,
} from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { SwitchServiceBase } from '@ecoflow/services/switchServiceBase';

export class SwitchXboostService extends SwitchServiceBase {
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<Delta2AllQuotaData>,
    private readonly setAcModuleType: Delta2MqttSetModuleType
  ) {
    super(ecoFlowAccessory, 'X-Boost');
  }

  protected processOnSetOn(value: boolean, revert: () => void): Promise<void> {
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

  private sendOn<TParams extends Delta2MqttSetMessageParams>(
    moduleType: Delta2MqttSetModuleType,
    operateType: Delta2MqttSetOperationType,
    params: TParams,
    revert: () => void
  ): Promise<void> {
    const message: Delta2MqttSetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      moduleType,
      operateType,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
