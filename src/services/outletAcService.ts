import { BatteryAllQuotaData } from 'accessories/batteries/batteryAccessory';
import { EcoFlowAccessoryWithQuota } from '../accessories/ecoFlowAccessory';
import { MqttSetEnabledMessageParams, OutletsServiceBase } from './outletServiceBase';

export class OutletAcService<TAllQuotaData extends BatteryAllQuotaData> extends OutletsServiceBase {
  constructor(protected readonly ecoFlowAccessory: EcoFlowAccessoryWithQuota<TAllQuotaData>) {
    super('AC', ecoFlowAccessory);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<MqttSetAcEnabledMessageParams>(
      3,
      'acOutCfg',
      {
        out_voltage: this.ecoFlowAccessory.quota.inv.cfgAcOutVol!,
        out_freq: this.ecoFlowAccessory.quota.inv.cfgAcOutFreq!,
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
