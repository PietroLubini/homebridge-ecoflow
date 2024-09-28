import {
  BatteryAllQuotaData,
  EmsStatus,
  InvStatus,
  PdStatus,
} from '@ecoflow/accessories/batteries/interfaces/httpApiBatteryContracts';
import {
  MqttBatteryMessageType,
  MqttBatteryQuotaMessage,
  MqttBatteryQuotaMessageWithParams,
} from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { OutletAcService } from '@ecoflow/accessories/batteries/services/outletAcService';
import { OutletCarService } from '@ecoflow/accessories/batteries/services/outletCarService';
import { OutletUsbService } from '@ecoflow/accessories/batteries/services/outletUsbService';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage, MqttQuotaMessageWithParams } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceConfig } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

export abstract class BatteryAccessoryBase extends EcoFlowAccessoryWithQuotaBase<BatteryAllQuotaData> {
  private readonly batteryService: BatteryStatusService;
  private readonly outletUsbService: OutletUsbService;
  private readonly outletAcService: OutletAcService;
  private readonly outletCarService: OutletCarService;

  constructor(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    log: Logging,
    httpApiManager: EcoFlowHttpApiManager,
    mqttApiManager: EcoFlowMqttApiManager,
    batteryStatusProvider: BatteryStatusProvider
  ) {
    super(platform, accessory, config, log, httpApiManager, mqttApiManager);
    this.batteryService = new BatteryStatusService(this, batteryStatusProvider);
    this.outletUsbService = new OutletUsbService(this, batteryStatusProvider);
    this.outletAcService = new OutletAcService(this, batteryStatusProvider);
    this.outletCarService = new OutletCarService(this, batteryStatusProvider);
  }

  protected override getServices(): ServiceBase[] {
    return [this.batteryService, this.outletUsbService, this.outletAcService, this.outletCarService];
  }

  protected override processQuotaMessage(message: MqttQuotaMessage): void {
    const batteryMessage = message as MqttBatteryQuotaMessage;
    if (batteryMessage.typeCode === MqttBatteryMessageType.EMS) {
      const emsStatus = (message as MqttQuotaMessageWithParams<EmsStatus>).params;
      Object.assign(this.quota.bms_emsStatus, emsStatus);
      this.updateEmsValues(emsStatus);
    } else if (batteryMessage.typeCode === MqttBatteryMessageType.INV) {
      const invStatus = (message as MqttQuotaMessageWithParams<InvStatus>).params;
      Object.assign(this.quota.inv, invStatus);
      this.updateInvValues(invStatus);
    } else if (batteryMessage.typeCode === MqttBatteryMessageType.PD) {
      const pdStatus = (message as MqttQuotaMessageWithParams<PdStatus>).params;
      Object.assign(this.quota.pd, pdStatus);
      this.updatePdValues(pdStatus);
    }
  }

  protected override initializeQuota(quota: BatteryAllQuotaData | null): BatteryAllQuotaData {
    const result = quota ?? ({} as BatteryAllQuotaData);
    if (!result.bms_emsStatus) {
      result.bms_emsStatus = {};
    }
    if (!result.inv) {
      result.inv = {};
    }
    if (!result.pd) {
      result.pd = {};
    }
    return result;
  }

  protected override updateInitialValues(initialData: BatteryAllQuotaData): void {
    this.updateEmsInitialValues(initialData.bms_emsStatus);
    this.updateInvInitialValues(initialData.inv);
    this.updatePdInitialValues(initialData.pd);
  }

  private updateEmsInitialValues(params: EmsStatus): void {
    const message: MqttBatteryQuotaMessageWithParams<EmsStatus> = {
      typeCode: MqttBatteryMessageType.EMS,
      params,
    };
    this.processQuotaMessage(message);
  }

  private updateInvInitialValues(params: InvStatus): void {
    const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
      typeCode: MqttBatteryMessageType.INV,
      params,
    };
    this.processQuotaMessage(message);
  }

  private updatePdInitialValues(params: PdStatus): void {
    const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
      typeCode: MqttBatteryMessageType.PD,
      params,
    };
    this.processQuotaMessage(message);
  }

  private updateEmsValues(params: EmsStatus): void {
    if (params.f32LcdShowSoc !== undefined && params.minDsgSoc !== undefined) {
      this.batteryService.updateBatteryLevel(params.f32LcdShowSoc, params.minDsgSoc);
      this.outletAcService.updateBatteryLevel(params.f32LcdShowSoc, params.minDsgSoc);
      this.outletUsbService.updateBatteryLevel(params.f32LcdShowSoc, params.minDsgSoc);
      this.outletCarService.updateBatteryLevel(params.f32LcdShowSoc, params.minDsgSoc);
    }
  }

  private updateInvValues(params: InvStatus): void {
    if (params.inputWatts !== undefined) {
      this.batteryService.updateChargingState(params.inputWatts);
      this.outletAcService.updateChargingState(params.inputWatts);
      this.outletUsbService.updateChargingState(params.inputWatts);
      this.outletCarService.updateChargingState(params.inputWatts);
      this.outletAcService.updateInputConsumption(params.inputWatts);
      this.outletUsbService.updateInputConsumption(params.inputWatts);
      this.outletCarService.updateInputConsumption(params.inputWatts);
    }
    if (params.cfgAcEnabled !== undefined) {
      this.outletAcService.updateState(params.cfgAcEnabled);
    }
    if (params.outputWatts !== undefined) {
      this.outletAcService.updateOutputConsumption(params.outputWatts);
    }
  }

  private updatePdValues(params: PdStatus): void {
    if (params.carState !== undefined) {
      this.outletCarService.updateState(params.carState);
    }
    if (params.carWatts !== undefined) {
      this.outletCarService.updateOutputConsumption(params.carWatts);
    }
    if (params.dcOutState !== undefined) {
      this.outletUsbService.updateState(params.dcOutState);
    }
    if (
      params.usb1Watts !== undefined ||
      params.usb2Watts !== undefined ||
      params.qcUsb1Watts !== undefined ||
      params.qcUsb2Watts !== undefined ||
      params.typec1Watts !== undefined ||
      params.typec2Watts !== undefined
    ) {
      const usbWatts = this.sum(
        params.usb1Watts,
        params.usb2Watts,
        params.qcUsb1Watts,
        params.qcUsb2Watts,
        params.typec1Watts,
        params.typec2Watts
      );
      this.outletUsbService.updateOutputConsumption(usbWatts);
    }
  }
}
