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

export class Delta2MaxAccessory extends EcoFlowAccessoryWithQuota<GetQuotaAllCmdResponseData> {
  private batteryService: BatteryService | null = null;
  private outletUsbService: OutletUsbService | null = null;
  private outletAcService: OutletAcService | null = null;
  private outletCarService: OutletCarService | null = null;

  protected override createServices(): ServiceBase[] {
    const result: ServiceBase[] = [];

    this.batteryService = new BatteryService(this);
    this.outletUsbService = new OutletUsbService(this);
    this.outletAcService = new OutletAcService(this);
    this.outletCarService = new OutletCarService(this);

    result.push(this.batteryService);
    result.push(this.outletUsbService);
    result.push(this.outletAcService);
    result.push(this.outletCarService);

    return result;
  }

  public override async initialize(): Promise<void> {
    await super.initialize();
    this.getInitialValues();
  }

  protected override subscribeOnParameterUpdates(): Subscription[] {
    const result = [];
    result.push(this.mqttApi.bmsParams$.subscribe(params => this.updateBmsParams(params)));
    result.push(this.mqttApi.invParams$.subscribe(params => this.updateInvParams(params)));
    result.push(this.mqttApi.pdParams$.subscribe(params => this.updatePdParams(params)));
    return result;
  }

  private updateBmsParams(params: BmsStatusMqttMessageParams): void {
    if (params.f32ShowSoc !== undefined) {
      this.batteryService!.updateStatusLowBattery(params.f32ShowSoc);
      this.batteryService!.updateBatteryLevel(params.f32ShowSoc);
    }
  }

  private updateInvParams(params: InvStatusMqttMessageParams): void {
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

  private updatePdParams(params: PdStatusMqttMessageParams): void {
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

  private getInitialValues(): void {
    this.getBmsInitialValues();
    this.getInvInitialValues();
    this.getPdInitialValues();
  }

  private getBmsInitialValues(): void {
    const bmsMessage: MqttMessage<BmsStatusMqttMessageParams> = {
      typeCode: MqttMessageType.BMS,
      params: {
        f32ShowSoc: this.initialData['bms_bmsStatus.f32ShowSoc'],
      },
    };
    this.mqttApi.processMqttMessage(bmsMessage);
  }

  private getInvInitialValues(): void {
    const invMessage: MqttMessage<InvStatusMqttMessageParams> = {
      typeCode: MqttMessageType.INV,
      params: {
        inputWatts: this.initialData['inv.inputWatts'],
        outputWatts: this.initialData['inv.outputWatts'],
        cfgAcEnabled: this.initialData['inv.cfgAcEnabled'],
      },
    };
    this.mqttApi.processMqttMessage(invMessage);
  }

  private getPdInitialValues(): void {
    const pdMessage: MqttMessage<PdStatusMqttMessageParams> = {
      typeCode: MqttMessageType.PD,
      params: {
        carState: this.initialData['pd.carState'],
        carWatts: this.initialData['pd.carWatts'],
        dcOutState: this.initialData['pd.dcOutState'],
        usb1Watts: this.initialData['pd.usb1Watts'],
        usb2Watts: this.initialData['pd.usb2Watts'],
        qcUsb1Watts: this.initialData['pd.qcUsb1Watts'],
        qcUsb2Watts: this.initialData['pd.qcUsb2Watts'],
        typec1Watts: this.initialData['pd.typec1Watts'],
        typec2Watts: this.initialData['pd.typec2Watts'],
      },
    };
    this.mqttApi.processMqttMessage(pdMessage);
  }
}
