import { PlatformAccessory } from 'homebridge';
import {
  MqttSetEnabledMessageParams,
  PdStatusMqttMessageParams,
  PdStatusMqttMessageUsbParams,
} from 'accessories/apis/interfaces/ecoFlowMqttContacts.js';
import { EcoFlowMqttApi } from 'accessories/apis/ecoFlowMqttApi.js';
import { Subscription } from 'rxjs';
import { OutletsServiceBase } from './outletServiceBase.js';
import { EcoFlowHomebridgePlatform } from 'platform.js';
import { DeviceConfig } from 'config.js';

export class OutletUsbService extends OutletsServiceBase {
  constructor(
    accessory: PlatformAccessory,
    platform: EcoFlowHomebridgePlatform,
    config: DeviceConfig,
    api: EcoFlowMqttApi
  ) {
    super('USB', accessory, platform, config, api);
  }

  protected override subscribe(api: EcoFlowMqttApi): Subscription[] {
    const result = [];
    result.push(api.pdParams$.subscribe(params => this.updatePdParams(params)));
    return result;
  }

  protected override setOn(value: boolean): Promise<void> {
    return this.publishEnabled<MqttSetEnabledMessageParams>(1, 'dcOutCfg', { enabled: Number(value) });
  }

  private updatePdParams(params: PdStatusMqttMessageParams): void {
    this.updateUsb(params);
  }

  private updateUsb(params: PdStatusMqttMessageUsbParams): void {
    if (params.dcOutState !== undefined) {
      this.updateUsbState(params.dcOutState);
    }
    if (
      params.usb1Watts ||
      params.usb2Watts ||
      params.qcUsb1Watts ||
      params.qcUsb2Watts ||
      params.typec1Watts ||
      params.typec2Watts
    ) {
      const usbWatts =
        (params.usb1Watts ?? 0) +
        (params.usb2Watts ?? 0) +
        (params.qcUsb1Watts ?? 0) +
        (params.qcUsb2Watts ?? 0) +
        (params.typec1Watts ?? 0) +
        (params.typec2Watts ?? 0);
      this.updateUsbInUse(usbWatts);
    }
  }

  private updateUsbInUse(watts: number): void {
    const isInUse = watts > 0;
    this.log.debug('UsbInUse ->', isInUse);
    this.service.getCharacteristic(this.platform.Characteristic.OutletInUse).updateValue(isInUse);
  }

  private updateUsbState(state: boolean): void {
    this.log.debug('UsbState ->', state);
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(state);
  }
}
