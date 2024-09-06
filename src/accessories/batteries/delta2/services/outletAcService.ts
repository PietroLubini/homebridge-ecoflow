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
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2MqttApiContracts';
import { Delta2OutletServiceBase } from '@ecoflow/accessories/batteries/delta2/services/delta2OutletServiceBase';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';

export class OutletAcService extends Delta2OutletServiceBase {
  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<Delta2AllQuotaData>,
    private readonly setModuleType: Delta2MqttSetModuleType
  ) {
    super(ecoFlowAccessory, 'AC', ecoFlowAccessory.config.battery?.additionalCharacteristics);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<Delta2MqttSetAcOnMessageParams>(
      this.setModuleType,
      Delta2MqttSetOperationType.AcOutCfg,
      {
        out_voltage: AcOutVoltageIgnore,
        out_freq: AcOutFrequencyType.Ignore,
        xboost: AcXBoostType.Ignore,
        enabled: value ? AcEnableType.On : AcEnableType.Off,
      },
      revert
    );
  }
}
