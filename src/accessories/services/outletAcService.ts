import { BatteryAllQuotaData } from 'accessories/batteryAccessory.js';
import { EcoFlowAccessoryWithQuota } from '../ecoFlowAccessory.js';
import { MqttSetEnabledMessageParams, OutletsServiceBase } from './outletServiceBase.js';

export class OutletAcService<TAllQuotaData extends BatteryAllQuotaData> extends OutletsServiceBase {
  constructor(protected readonly ecoFlowAccessory: EcoFlowAccessoryWithQuota<TAllQuotaData>) {
    super('AC', ecoFlowAccessory);
  }

  protected override setOn(value: boolean): Promise<void> {
    return this.sendOn<MqttSetAcEnabledMessageParams>(3, 'acOutCfg', {
      out_voltage: this.ecoFlowAccessory.quota.inv.cfgAcOutVol!,
      out_freq: this.ecoFlowAccessory.quota.inv.cfgAcOutFreq!,
      xboost: Number(
        this.ecoFlowAccessory.quota.inv.cfgAcXboost !== undefined ? this.ecoFlowAccessory.quota.inv.cfgAcXboost : true
      ),
      enabled: Number(value),
    });
  }
}

interface MqttSetAcEnabledMessageParams extends MqttSetEnabledMessageParams {
  out_voltage: number;
  out_freq: number;
  xboost: number;
}
