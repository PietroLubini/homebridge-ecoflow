import { PlatformAccessory } from 'homebridge';
import {
  MqttSetEnabledMessageParams,
  PdStatusMqttMessageCarParams,
  PdStatusMqttMessageParams,
} from 'accessories/apis/interfaces/ecoFlowMqttContacts.js';
import { EcoFlowMqttApi } from 'accessories/apis/ecoFlowMqttApi.js';
import { Subscription } from 'rxjs';
import { OutletsServiceBase } from './outletServiceBase.js';
import { EcoFlowHomebridgePlatform } from 'platform.js';
import { DeviceConfig } from 'config.js';

export class OutletCarService extends OutletsServiceBase {
  constructor(
    accessory: PlatformAccessory,
    platform: EcoFlowHomebridgePlatform,
    config: DeviceConfig,
    api: EcoFlowMqttApi
  ) {
    super('CAR', accessory, platform, config, api);
  }

  protected override subscribe(api: EcoFlowMqttApi): Subscription[] {
    const result = [];
    result.push(api.pdParams$.subscribe(params => this.updatePdParams(params)));
    return result;
  }

  protected override setOn(value: boolean): Promise<void> {
    return this.publishEnabled<MqttSetEnabledMessageParams>(5, 'mpptCar', { enabled: Number(value) });
  }

  private updatePdParams(params: PdStatusMqttMessageParams): void {
    this.updateCar(params);
  }

  private updateCar(params: PdStatusMqttMessageCarParams): void {
    if (params.carState !== undefined) {
      this.updateCarState(params.carState);
    }
    if (params.carWatts !== undefined) {
      this.updateCarInUse(params.carWatts);
    }
  }

  private updateCarState(state: boolean): void {
    this.log.debug('CarState ->', state);
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(state);
  }

  private updateCarInUse(watts: number): void {
    const isInUse = watts > 0;
    this.log.debug('CarInUse ->', isInUse);
    this.service.getCharacteristic(this.platform.Characteristic.OutletInUse).updateValue(isInUse);
  }
}
