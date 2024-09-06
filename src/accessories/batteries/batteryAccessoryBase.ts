import { BatteryConfiguration } from '@ecoflow/accessories/batteries/interfaces/batteryConfiguration';
import {
  BatteryAllQuotaData,
  BmsStatus,
  InvStatus,
  MpptStatus,
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
import { SwitchXboostService } from '@ecoflow/accessories/batteries/services/switchXboostService';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage, MqttQuotaMessageWithParams } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceConfig } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

export abstract class BatteryAccessoryBase extends EcoFlowAccessoryWithQuotaBase<BatteryAllQuotaData> {
  private readonly batteryStatusService: BatteryStatusService;
  private readonly outletUsbService: OutletUsbService;
  private readonly outletAcService: OutletAcService;
  private readonly outletCarService: OutletCarService;
  private readonly switchXboostService: SwitchXboostService;

  constructor(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    log: Logging,
    httpApiManager: EcoFlowHttpApiManager,
    mqttApiManager: EcoFlowMqttApiManager,
    configuration: BatteryConfiguration
  ) {
    super(platform, accessory, config, log, httpApiManager, mqttApiManager);
    this.batteryStatusService = new BatteryStatusService(this);
    this.outletUsbService = new OutletUsbService(this);
    this.outletAcService = new OutletAcService(this, configuration.setAcModuleType);
    this.outletCarService = new OutletCarService(this);
    this.switchXboostService = new SwitchXboostService(this, configuration.setAcModuleType);
  }

  protected override getServices(): ServiceBase[] {
    return [
      this.batteryStatusService,
      this.outletUsbService,
      this.outletAcService,
      this.outletCarService,
      this.switchXboostService,
    ];
  }

  protected override processQuotaMessage(message: MqttQuotaMessage): void {
    const batteryMessage = message as MqttBatteryQuotaMessage;
    if (batteryMessage.typeCode === MqttBatteryMessageType.BMS) {
      const bmsStatus = (message as MqttQuotaMessageWithParams<BmsStatus>).params;
      Object.assign(this.quota.bms_bmsStatus, bmsStatus);
      this.updateBmsValues(bmsStatus);
    } else if (batteryMessage.typeCode === MqttBatteryMessageType.INV) {
      const invStatus = (message as MqttQuotaMessageWithParams<InvStatus>).params;
      Object.assign(this.quota.inv, invStatus);
      this.updateInvValues(invStatus);
    } else if (batteryMessage.typeCode === MqttBatteryMessageType.PD) {
      const pdStatus = (message as MqttQuotaMessageWithParams<PdStatus>).params;
      Object.assign(this.quota.pd, pdStatus);
      this.updatePdValues(pdStatus);
    } else if (batteryMessage.typeCode === MqttBatteryMessageType.MPPT) {
      const mpptStatus = (message as MqttQuotaMessageWithParams<MpptStatus>).params;
      Object.assign(this.quota.mppt, mpptStatus);
      this.updateMpptValues(mpptStatus);
    }
  }

  protected override initializeQuota(quota: BatteryAllQuotaData | null): BatteryAllQuotaData {
    const result = quota ?? ({} as BatteryAllQuotaData);
    if (!result.bms_bmsStatus) {
      result.bms_bmsStatus = {};
    }
    if (!result.inv) {
      result.inv = {};
    }
    if (!result.pd) {
      result.pd = {};
    }
    if (!result.mppt) {
      result.mppt = {};
    }
    return result;
  }

  protected override updateInitialValues(initialData: BatteryAllQuotaData): void {
    this.updateBmsInitialValues(initialData.bms_bmsStatus);
    this.updateInvInitialValues(initialData.inv);
    this.updatePdInitialValues(initialData.pd);
  }

  private updateBmsInitialValues(params: BmsStatus): void {
    const message: MqttBatteryQuotaMessageWithParams<BmsStatus> = {
      typeCode: MqttBatteryMessageType.BMS,
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

  private updateBmsValues(params: BmsStatus): void {
    if (params.f32ShowSoc !== undefined) {
      this.batteryStatusService.updateBatteryLevel(params.f32ShowSoc);
      this.outletAcService.updateBatteryLevel(params.f32ShowSoc);
      this.outletUsbService.updateBatteryLevel(params.f32ShowSoc);
      this.outletCarService.updateBatteryLevel(params.f32ShowSoc);
    }
  }

  private updateInvValues(params: InvStatus): void {
    if (params.inputWatts !== undefined) {
      const isCharging =
        params.inputWatts > 0 && (params.outputWatts === undefined || params.inputWatts !== params.outputWatts);
      this.batteryStatusService.updateChargingState(isCharging);
      this.outletAcService.updateInputConsumption(params.inputWatts);
      this.outletUsbService.updateInputConsumption(params.inputWatts);
      this.outletCarService.updateInputConsumption(params.inputWatts);
    }
    if (params.cfgAcEnabled !== undefined) {
      this.outletAcService.updateState(params.cfgAcEnabled);
    }
    if (params.cfgAcXboost !== undefined) {
      this.switchXboostService.updateState(params.cfgAcXboost);
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

  private updateMpptValues(params: MpptStatus): void {
    if (params.cfgAcEnabled !== undefined) {
      this.outletAcService.updateState(params.cfgAcEnabled);
    }
    if (params.cfgAcXboost !== undefined) {
      this.switchXboostService.updateState(params.cfgAcXboost);
    }
  }
}
