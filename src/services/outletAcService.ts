import { BatteryAllQuotaData } from '@ecoflow/accessories/batteries/batteryAccessory';
import { EcoFlowAccessoryWithQuota } from '@ecoflow/accessories/ecoFlowAccessory';
import { MqttSetEnabledMessageParams, OutletServiceBase } from '@ecoflow/services/outletServiceBase';

export class OutletAcService<TAllQuotaData extends BatteryAllQuotaData> extends OutletServiceBase {
  constructor(protected readonly ecoFlowAccessory: EcoFlowAccessoryWithQuota<TAllQuotaData>) {
    super('AC', ecoFlowAccessory);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<MqttSetAcEnabledMessageParams>(
      3,
      'acOutCfg',
      {
        out_voltage:
          this.ecoFlowAccessory.quota.inv.cfgAcOutVol !== undefined
            ? this.ecoFlowAccessory.quota.inv.cfgAcOutVol
            : 220000,
        out_freq:
          this.ecoFlowAccessory.quota.inv.cfgAcOutFreq !== undefined ? this.ecoFlowAccessory.quota.inv.cfgAcOutFreq : 1,
        xboost: Number(
          this.ecoFlowAccessory.quota.inv.cfgAcXboost !== undefined ? this.ecoFlowAccessory.quota.inv.cfgAcXboost : true
        ),
        enabled: Number(value),
      },
      revert
    );
  }
}

interface MqttSetAcEnabledMessageParams extends MqttSetEnabledMessageParams {
  out_voltage: number;
  out_freq: number;
  xboost: number;
}
