import { EmsStatus } from '@ecoflow/accessories/batteries/delta2/interfaces/delta2HttpApiContracts';
import {
  DeltaProAllQuotaData,
  InvStatus,
  PdStatus,
} from '@ecoflow/accessories/batteries/deltapro/interfaces/deltaProHttpApiContracts';
import { DeltaProMqttQuotaMessageWithParams } from '@ecoflow/accessories/batteries/deltapro/interfaces/deltaProMqttApiContracts';
import { OutletAcService } from '@ecoflow/accessories/batteries/deltapro/services/outletAcService';
import { OutletCarService } from '@ecoflow/accessories/batteries/deltapro/services/outletCarService';
import { OutletUsbService } from '@ecoflow/accessories/batteries/deltapro/services/outletUsbService';
import { SwitchXboostService } from '@ecoflow/accessories/batteries/deltapro/services/switchXboostService';
import { AcEnableType, AcXBoostType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';
import { DeviceConfig } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

export class DeltaProAccessory extends EcoFlowAccessoryWithQuotaBase<DeltaProAllQuotaData> {
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
    batteryStatusProvider: BatteryStatusProvider
  ) {
    super(platform, accessory, config, log, httpApiManager, mqttApiManager);
    this.batteryStatusService = new BatteryStatusService(this, batteryStatusProvider);
    this.outletUsbService = new OutletUsbService(this, batteryStatusProvider);
    this.outletAcService = new OutletAcService(this, batteryStatusProvider);
    this.outletCarService = new OutletCarService(this, batteryStatusProvider);
    this.switchXboostService = new SwitchXboostService(this);
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
    const data = (message as DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData>).data;
    if (data?.ems !== undefined && Object.keys(data.ems).length > 0) {
      Object.assign(this.quota.ems, data.ems);
      this.updateEmsValues(data.ems);
    }
    if (data?.inv !== undefined && Object.keys(data.inv).length > 0) {
      Object.assign(this.quota.inv, data.inv);
      this.updateInvValues(data.inv);
    }
    if (data?.pd !== undefined && Object.keys(data.pd).length > 0) {
      Object.assign(this.quota.pd, data.pd);
      this.updatePdValues(data.pd);
    }
  }

  protected override initializeQuota(quota: DeltaProAllQuotaData | null): DeltaProAllQuotaData {
    const result = quota ?? ({} as DeltaProAllQuotaData);
    if (!result.ems) {
      result.ems = {};
    }
    if (!result.inv) {
      result.inv = {};
    }
    if (!result.pd) {
      result.pd = {};
    }
    return result;
  }

  protected override updateInitialValues(data: DeltaProAllQuotaData): void {
    const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
      data,
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
      this.outletAcService.updateChargingState(isCharging);
      this.outletUsbService.updateChargingState(isCharging);
      this.outletCarService.updateChargingState(isCharging);
      this.outletAcService.updateInputConsumption(params.inputWatts);
      this.outletUsbService.updateInputConsumption(params.inputWatts);
      this.outletCarService.updateInputConsumption(params.inputWatts);
    }
    if (params.outputWatts !== undefined) {
      this.outletAcService.updateOutputConsumption(params.outputWatts);
    }
    if (params.cfgAcEnabled !== undefined && params.cfgAcEnabled !== AcEnableType.Ignore) {
      this.outletAcService.updateState(params.cfgAcEnabled === AcEnableType.On);
    }
    if (params.cfgAcXboost !== undefined && params.cfgAcXboost !== AcXBoostType.Ignore) {
      this.switchXboostService.updateState(params.cfgAcXboost === AcXBoostType.On);
    }
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
}
