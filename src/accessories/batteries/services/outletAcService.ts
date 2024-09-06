import { AcOutFrequency, BatteryAllQuotaData } from '@ecoflow/accessories/batteries/interfaces/httpApiBatteryContracts';
import {
  MqttBatterySetAcOnMessageParams,
  MqttBatterySetModuleType,
  MqttBatterySetOperationType,
} from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { OutletBatteryServiceBase } from '@ecoflow/accessories/batteries/services/outletBatteryServiceBase';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';

export class OutletAcService extends OutletBatteryServiceBase {
  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<BatteryAllQuotaData>,
    private readonly setModuleType: MqttBatterySetModuleType
  ) {
    super(ecoFlowAccessory, 'AC', ecoFlowAccessory.config.battery?.additionalCharacteristics);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<MqttBatterySetAcOnMessageParams>(
      this.setModuleType,
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
        xboost: Number(
          this.ecoFlowAccessory.quota.inv.cfgAcXboost !== undefined ? this.ecoFlowAccessory.quota.inv.cfgAcXboost : true
        ),
        enabled: Number(value),
      },
      revert
    );
  }
}
