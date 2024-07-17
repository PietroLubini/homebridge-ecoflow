import { PlatformAccessory } from 'homebridge';
import {
  InvStatusMqttMessageParams,
  MqttSetAcEnabledMessageParams,
} from 'accessories/apis/interfaces/ecoFlowMqttContacts.js';
import { EcoFlowMqttApi } from 'accessories/apis/ecoFlowMqttApi.js';
import { Subscription } from 'rxjs';
import { OutletsServiceBase } from './outletServiceBase.js';
import { EcoFlowHomebridgePlatform } from 'platform.js';
import { DeviceConfig } from 'config.js';

export class OutletAcService extends OutletsServiceBase {
  constructor(
    accessory: PlatformAccessory,
    platform: EcoFlowHomebridgePlatform,
    config: DeviceConfig,
    api: EcoFlowMqttApi
  ) {
    super('AC', accessory, platform, config, api);
  }

  protected override subscribe(api: EcoFlowMqttApi): Subscription[] {
    const result = [];
    result.push(api.invParams$.subscribe(params => this.updateInvParams(params)));
    return result;
  }

  protected override setOn(value: boolean): Promise<void> {
    return this.publishEnabled<MqttSetAcEnabledMessageParams>(3, 'acOutCfg', {
      out_voltage: 4294967295,
      out_freq: 1,
      xboost: Number(true),
      enabled: Number(value),
    });
  }

  private updateInvParams(params: InvStatusMqttMessageParams): void {
    this.updateAc(params);
  }

  private updateAc(params: InvStatusMqttMessageParams): void {
    if (params.cfgAcEnabled !== undefined) {
      this.updateAcState(params.cfgAcEnabled);
    }
    if (params.outputWatts !== undefined) {
      this.updateAcInUse(params.outputWatts);
    }
  }

  private updateAcState(state: boolean): void {
    this.log.debug('AcState ->', state);
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(state);
  }

  private updateAcInUse(watts: number): void {
    const isInUse = watts > 0;
    this.log.debug('AcInUse ->', isInUse);
    this.service.getCharacteristic(this.platform.Characteristic.OutletInUse).updateValue(isInUse);
  }
}
