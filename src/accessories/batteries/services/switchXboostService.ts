import { AcOutFrequency, BatteryAllQuotaData } from '@ecoflow/accessories/batteries/interfaces/httpApiBatteryContracts';
import {
  MqttBatterySetAcOnMessageParams,
  MqttBatterySetMessageWithParams,
  MqttBatterySetModuleType,
  MqttBatterySetOperationType,
} from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { SwitchXboostServiceBase } from '@ecoflow/services/switchXboostServiceBase';

export class SwitchXboostService extends SwitchXboostServiceBase {
  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<BatteryAllQuotaData>,
    private readonly setAcModuleType: MqttBatterySetModuleType
  ) {
    super(ecoFlowAccessory);
  }

  protected setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<MqttBatterySetAcOnMessageParams>(
      this.setAcModuleType,
      MqttBatterySetOperationType.AcOutCfg,
      {
        out_voltage:
          this.ecoFlowAccessory.quota.inv.cfgAcOutVol !== undefined
            ? this.ecoFlowAccessory.quota.inv.cfgAcOutVol
            : 220000,
        out_freq:
          this.ecoFlowAccessory.quota.inv.cfgAcOutFreq !== undefined
            ? this.ecoFlowAccessory.quota.inv.cfgAcOutFreq
            : AcOutFrequency['50 Hz'],
        xboost: Number(value),
        enabled: Number(
          this.ecoFlowAccessory.quota.inv.cfgAcEnabled !== undefined
            ? this.ecoFlowAccessory.quota.inv.cfgAcEnabled
            : false
        ),
      },
      revert
    );
  }

  private sendOn<TParams>(
    moduleType: MqttBatterySetModuleType,
    operateType: MqttBatterySetOperationType,
    params: TParams,
    revert: () => void
  ): Promise<void> {
    const message: MqttBatterySetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      moduleType,
      operateType,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
