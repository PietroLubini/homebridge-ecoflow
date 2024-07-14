import { PlatformAccessory, Service } from 'homebridge';
import { ServiceBase } from './serviceBase.js';
import { DeviceConfig } from '../../config.js';
import { EcoFlowHomebridgePlatform } from 'platform.js';
import {
  InvStatusMqttMessageParams,
  PdStatusMqttMessageCarParams,
  PdStatusMqttMessageParams,
  PdStatusMqttMessageUsbParams,
} from 'accessories/apis/interfaces/ecoFlowMqttContacts.js';
import { EcoFlowMqttApi } from 'accessories/apis/ecoFlowMqttApi.js';
import { Subscription } from 'rxjs';

export class OutletsService extends ServiceBase {
  private readonly acService: Service;
  private readonly carService: Service;
  private readonly usbService: Service;

  constructor(
    accessory: PlatformAccessory,
    platform: EcoFlowHomebridgePlatform,
    config: DeviceConfig,
    api: EcoFlowMqttApi
  ) {
    super(accessory, platform, config, api);

    this.acService = this.getOrAddService('AC');
    this.carService = this.getOrAddService('CAR');
    this.usbService = this.getOrAddService('USB');
  }

  protected override subscribe(api: EcoFlowMqttApi): Subscription[] {
    const result = [];
    result.push(api.pdParams$.subscribe(params => this.updatePdParams(params)));
    result.push(api.invParams$.subscribe(params => this.updateInvParams(params)));
    return result;
  }

  private updatePdParams(params: PdStatusMqttMessageParams): void {
    this.updateCar(params);
    this.updateUsb(params);
  }

  private updateInvParams(params: InvStatusMqttMessageParams): void {
    this.updateAc(params);
  }

  private updateCar(params: PdStatusMqttMessageCarParams): void {
    if (params.carState !== undefined) {
      this.updateCarState(params.carState);
    }
    if (params.carWatts) {
      this.updateCarInUse(params.carWatts);
    }
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

  private updateAc(params: InvStatusMqttMessageParams): void {
    if (params.cfgAcEnabled !== undefined) {
      this.updateAcState(params.cfgAcEnabled);
    }
    if (params.outputWatts) {
      this.updateAcInUse(params.outputWatts);
    }
  }

  private updateCarState(state: boolean): void {
    this.log.debug('CarState ->', state);
    this.carService.getCharacteristic(this.platform.Characteristic.On).updateValue(state);
  }

  private updateCarInUse(watts: number): void {
    const isInUse = watts > 0;
    this.log.debug('CarInUse ->', isInUse);
    this.carService.getCharacteristic(this.platform.Characteristic.OutletInUse).updateValue(isInUse);
  }

  private updateUsbInUse(watts: number): void {
    const isInUse = watts > 0;
    this.log.debug('UsbInUse ->', isInUse);
    this.usbService.getCharacteristic(this.platform.Characteristic.OutletInUse).updateValue(isInUse);
  }

  private updateUsbState(state: boolean): void {
    this.log.debug('UsbState ->', state);
    this.usbService.getCharacteristic(this.platform.Characteristic.On).updateValue(state);
  }

  private updateAcState(state: boolean): void {
    this.log.debug('AcState ->', state);
    this.acService.getCharacteristic(this.platform.Characteristic.On).updateValue(state);
  }

  private updateAcInUse(watts: number): void {
    const isInUse = watts > 0;
    this.log.debug('AcInUse ->', isInUse);
    this.acService.getCharacteristic(this.platform.Characteristic.OutletInUse).updateValue(isInUse);
  }

  private getOrAddService(name: string): Service {
    const service =
      this.accessory.getServiceById(this.platform.Service.Outlet, name) ||
      this.accessory.addService(this.platform.Service.Outlet, name, name);
    return service;
  }
}
