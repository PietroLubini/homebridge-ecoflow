import { Delta2Configuration } from '@ecoflow/accessories/batteries/delta2/interfaces/delta2Configuration';
import {
  Delta2AllQuotaData,
  InvStatus,
  MpptStatus,
  PdStatus,
  StatusAc,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2HttpApiContracts';
import {
  Delta2MqttMessageType,
  Delta2MqttQuotaMessage,
  Delta2MqttQuotaMessageWithParams,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2MqttApiContracts';
import { OutletAcService } from '@ecoflow/accessories/batteries/delta2/services/outletAcService';
import { OutletCarService } from '@ecoflow/accessories/batteries/delta2/services/outletCarService';
import { OutletUsbService } from '@ecoflow/accessories/batteries/delta2/services/outletUsbService';
import { SwitchXboostService } from '@ecoflow/accessories/batteries/delta2/services/switchXboostService';
import {
  AcEnableType,
  AcXBoostType,
  EnableType,
} from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { EmsStatus } from '@ecoflow/accessories/batteries/interfaces/httpApiBatteryContracts';
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

export abstract class Delta2AccessoryBase extends EcoFlowAccessoryWithQuotaBase<Delta2AllQuotaData> {
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
    batteryStatusProvider: BatteryStatusProvider,
    configuration: Delta2Configuration
  ) {
    super(platform, accessory, config, log, httpApiManager, mqttApiManager);
    this.batteryStatusService = new BatteryStatusService(this, batteryStatusProvider);
    this.outletUsbService = new OutletUsbService(this, batteryStatusProvider);
    this.outletAcService = new OutletAcService(this, batteryStatusProvider, configuration.setAcModuleType);
    this.outletCarService = new OutletCarService(this, batteryStatusProvider);
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
    const batteryMessage = message as Delta2MqttQuotaMessage;
    if (batteryMessage.typeCode === Delta2MqttMessageType.EMS) {
      const emsStatus = (message as MqttQuotaMessageWithParams<EmsStatus>).params;
      Object.assign(this.quota.bms_emsStatus, emsStatus);
      this.updateEmsValues(emsStatus);
    } else if (batteryMessage.typeCode === Delta2MqttMessageType.INV) {
      const invStatus = (message as MqttQuotaMessageWithParams<InvStatus>).params;
      Object.assign(this.quota.inv, invStatus);
      this.updateInvValues(invStatus);
    } else if (batteryMessage.typeCode === Delta2MqttMessageType.PD) {
      const pdStatus = (message as MqttQuotaMessageWithParams<PdStatus>).params;
      Object.assign(this.quota.pd, pdStatus);
      this.updatePdValues(pdStatus);
    } else if (batteryMessage.typeCode === Delta2MqttMessageType.MPPT) {
      const mpptStatus = (message as MqttQuotaMessageWithParams<MpptStatus>).params;
      Object.assign(this.quota.mppt, mpptStatus);
      this.updateMpptValues(mpptStatus);
    }
  }

  protected override initializeQuota(quota: Delta2AllQuotaData | null): Delta2AllQuotaData {
    const result = quota ?? ({} as Delta2AllQuotaData);
    if (!result.bms_emsStatus) {
      result.bms_emsStatus = {};
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

  protected override updateInitialValues(initialData: Delta2AllQuotaData): void {
    this.updateEmsInitialValues(initialData.bms_emsStatus);
    this.updateInvInitialValues(initialData.inv);
    this.updatePdInitialValues(initialData.pd);
    this.updateMpptInitialValues(initialData.mppt);
  }

  private updateEmsInitialValues(params: EmsStatus): void {
    const message: Delta2MqttQuotaMessageWithParams<EmsStatus> = {
      typeCode: Delta2MqttMessageType.EMS,
      params,
    };
    this.processQuotaMessage(message);
  }

  private updateInvInitialValues(params: InvStatus): void {
    const message: Delta2MqttQuotaMessageWithParams<InvStatus> = {
      typeCode: Delta2MqttMessageType.INV,
      params,
    };
    this.processQuotaMessage(message);
  }

  private updatePdInitialValues(params: PdStatus): void {
    const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
      typeCode: Delta2MqttMessageType.PD,
      params,
    };
    this.processQuotaMessage(message);
  }

  private updateMpptInitialValues(params: MpptStatus): void {
    const message: Delta2MqttQuotaMessageWithParams<MpptStatus> = {
      typeCode: Delta2MqttMessageType.MPPT,
      params,
    };
    this.processQuotaMessage(message);
  }

  private updateEmsValues(params: EmsStatus): void {
    if (params.f32LcdShowSoc !== undefined && params.minDsgSoc !== undefined) {
      this.batteryStatusService.updateBatteryLevel(params.f32LcdShowSoc, params.minDsgSoc);
      this.outletAcService.updateBatteryLevel(params.f32LcdShowSoc, params.minDsgSoc);
      this.outletUsbService.updateBatteryLevel(params.f32LcdShowSoc, params.minDsgSoc);
      this.outletCarService.updateBatteryLevel(params.f32LcdShowSoc, params.minDsgSoc);
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
    if (params.outputWatts !== undefined) {
      this.outletAcService.updateOutputConsumption(params.outputWatts);
    }
    this.updateAcValues(params);
  }

  private updatePdValues(params: PdStatus): void {
    if (params.carState !== undefined) {
      this.outletCarService.updateState(params.carState === EnableType.On);
    }
    if (params.carWatts !== undefined) {
      this.outletCarService.updateOutputConsumption(params.carWatts);
    }
    if (params.dcOutState !== undefined) {
      this.outletUsbService.updateState(params.dcOutState === EnableType.On);
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
    this.updateAcValues(params);
  }

  private updateAcValues(params: StatusAc): void {
    if (params.cfgAcEnabled !== undefined && params.cfgAcEnabled !== AcEnableType.Ignore) {
      this.outletAcService.updateState(params.cfgAcEnabled === AcEnableType.On);
    }
    if (params.cfgAcXboost !== undefined && params.cfgAcXboost !== AcXBoostType.Ignore) {
      this.switchXboostService.updateState(params.cfgAcXboost === AcXBoostType.On);
    }
  }
}
