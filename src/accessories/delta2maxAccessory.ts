import { EcoFlowAccessoryWithQuota } from './ecoFlowAccessory.js';
import { BatteryService } from './services/batteryService.js';
import { ServiceBase } from './services/serviceBase.js';
import { OutletUsbService } from './services/outletUsbService.js';
import { OutletCarService } from './services/outletCarService.js';
import { OutletAcService } from './services/outletAcService.js';
import { GetQuotaAllCmdResponseData } from './apis/interfaces/ecoFlowHttpContacts.js';
import {
  BmsStatusMqttMessageParams,
  InvStatusMqttMessageParams,
  MqttMessage,
  MqttMessageType,
  PdStatusMqttMessageParams,
} from './apis/interfaces/ecoFlowMqttContacts.js';
import { Subscription } from 'rxjs';
import { EcoFlowHomebridgePlatform } from 'platform.js';
import { PlatformAccessory } from 'homebridge';
import { DeviceConfig } from 'config.js';

export class Delta2MaxAccessory extends EcoFlowAccessoryWithQuota<GetQuotaAllCmdResponseData> {
  private readonly batteryService: BatteryService;
  private readonly outletUsbService: OutletUsbService;
  private readonly outletAcService: OutletAcService;
  private readonly outletCarService: OutletCarService;

  constructor(
    public readonly platform: EcoFlowHomebridgePlatform,
    public readonly accessory: PlatformAccessory,
    public readonly config: DeviceConfig
  ) {
    super(platform, accessory, config);
    this.batteryService = new BatteryService(this);
    this.outletUsbService = new OutletUsbService(this);
    this.outletAcService = new OutletAcService(this);
    this.outletCarService = new OutletCarService(this);
  }

  protected override getServices(): ServiceBase[] {
    return [this.batteryService, this.outletUsbService, this.outletAcService, this.outletCarService];
  }

  protected override updateInitialValues(initialData: GetQuotaAllCmdResponseData): void {
    this.updateBmsInitialValues(initialData);
    this.updateInvInitialValues(initialData);
    this.updatePdInitialValues(initialData);
  }

  protected override subscribeOnParameterUpdates(): Subscription[] {
    return [
      this.mqttApi.bmsParams$.subscribe(params => this.updateBmsValues(params)),
      this.mqttApi.invParams$.subscribe(params => this.updateInvValues(params)),
      this.mqttApi.pdParams$.subscribe(params => this.updatePdValues(params)),
    ];
  }

  private updateBmsInitialValues(initialData: GetQuotaAllCmdResponseData): void {
    const bmsMessage: MqttMessage<BmsStatusMqttMessageParams> = {
      typeCode: MqttMessageType.BMS,
      params: {
        f32ShowSoc: initialData['bms_bmsStatus.f32ShowSoc'],
      },
    };
    this.mqttApi.processMqttMessage(bmsMessage);
  }

  private updateInvInitialValues(initialData: GetQuotaAllCmdResponseData): void {
    const invMessage: MqttMessage<InvStatusMqttMessageParams> = {
      typeCode: MqttMessageType.INV,
      params: {
        inputWatts: initialData['inv.inputWatts'],
        outputWatts: initialData['inv.outputWatts'],
        cfgAcEnabled: initialData['inv.cfgAcEnabled'],
      },
    };
    this.mqttApi.processMqttMessage(invMessage);
  }

  private updatePdInitialValues(initialData: GetQuotaAllCmdResponseData): void {
    const pdMessage: MqttMessage<PdStatusMqttMessageParams> = {
      typeCode: MqttMessageType.PD,
      params: {
        carState: initialData['pd.carState'],
        carWatts: initialData['pd.carWatts'],
        dcOutState: initialData['pd.dcOutState'],
        usb1Watts: initialData['pd.usb1Watts'],
        usb2Watts: initialData['pd.usb2Watts'],
        qcUsb1Watts: initialData['pd.qcUsb1Watts'],
        qcUsb2Watts: initialData['pd.qcUsb2Watts'],
        typec1Watts: initialData['pd.typec1Watts'],
        typec2Watts: initialData['pd.typec2Watts'],
      },
    };
    this.mqttApi.processMqttMessage(pdMessage);
  }

  private updateBmsValues(params: BmsStatusMqttMessageParams): void {
    if (params.f32ShowSoc !== undefined) {
      this.batteryService!.updateStatusLowBattery(params.f32ShowSoc);
      this.batteryService!.updateBatteryLevel(params.f32ShowSoc);
    }
  }

  private updateInvValues(params: InvStatusMqttMessageParams): void {
    if (params.inputWatts !== undefined) {
      this.batteryService!.updateChargingState(params.inputWatts);
    }
    if (params.cfgAcEnabled !== undefined) {
      this.outletAcService!.updateState(params.cfgAcEnabled);
    }
    if (params.outputWatts !== undefined) {
      this.outletAcService!.updateInUse(params.outputWatts > 0);
    }
  }

  private updatePdValues(params: PdStatusMqttMessageParams): void {
    if (params.carState !== undefined) {
      this.outletCarService!.updateState(params.carState);
    }
    if (params.carWatts !== undefined) {
      this.outletCarService!.updateInUse(params.carWatts > 0);
    }
    if (params.dcOutState !== undefined) {
      this.outletUsbService!.updateState(params.dcOutState);
    }
    if (
      params.usb1Watts !== undefined ||
      params.usb2Watts !== undefined ||
      params.qcUsb1Watts !== undefined ||
      params.qcUsb2Watts !== undefined ||
      params.typec1Watts !== undefined ||
      params.typec2Watts !== undefined
    ) {
      const usbWatts = this.getUsbWatts(
        params.usb1Watts,
        params.usb2Watts,
        params.qcUsb1Watts,
        params.qcUsb2Watts,
        params.typec1Watts,
        params.typec2Watts
      );
      this.outletUsbService!.updateInUse(usbWatts > 0);
    }
  }

  private getUsbWatts(
    usb1Watts?: number,
    usb2Watts?: number,
    qcUsb1Watts?: number,
    qcUsb2Watts?: number,
    typec1Watts?: number,
    typec2Watts?: number
  ): number {
    return (
      (usb1Watts ?? 0) +
      (usb2Watts ?? 0) +
      (qcUsb1Watts ?? 0) +
      (qcUsb2Watts ?? 0) +
      (typec1Watts ?? 0) +
      (typec2Watts ?? 0)
    );
  }
}
