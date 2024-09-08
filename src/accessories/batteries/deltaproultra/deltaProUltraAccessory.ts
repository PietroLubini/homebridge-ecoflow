import {
  DeltaProUltraAllQuotaData,
  PdStatus,
  PdStatusAc,
  PdStatusSoc,
  PdStatusUsb,
  PdStatusWatts,
} from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraHttpApiContracts';
import { DeltaProUltraMqttQuotaMessageWithParams } from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraMqttApiContracts';
import { OutletAcService } from '@ecoflow/accessories/batteries/deltaproultra/services/outletAcService';
import { OutletUsbService } from '@ecoflow/accessories/batteries/deltaproultra/services/outletUsbService';
import { SwitchXboostService } from '@ecoflow/accessories/batteries/deltaproultra/services/switchXboostService';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceConfig } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

export class DeltaProUltraAccessory extends EcoFlowAccessoryWithQuotaBase<DeltaProUltraAllQuotaData> {
  private readonly batteryStatusService: BatteryStatusService;
  private readonly outletUsbService: OutletUsbService;
  private readonly outletAcService: OutletAcService;
  private readonly switchXboostService: SwitchXboostService;

  constructor(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    log: Logging,
    httpApiManager: EcoFlowHttpApiManager,
    mqttApiManager: EcoFlowMqttApiManager
  ) {
    super(platform, accessory, config, log, httpApiManager, mqttApiManager);
    this.batteryStatusService = new BatteryStatusService(this);
    this.outletUsbService = new OutletUsbService(this);
    this.outletAcService = new OutletAcService(this);
    this.switchXboostService = new SwitchXboostService(this);
  }

  protected override getServices(): ServiceBase[] {
    return [this.batteryStatusService, this.outletUsbService, this.outletAcService, this.switchXboostService];
  }

  protected override processQuotaMessage(message: MqttQuotaMessage): void {
    const data = (message as DeltaProUltraMqttQuotaMessageWithParams<DeltaProUltraAllQuotaData>).data;
    if (data.hs_yj751_pd_appshow_addr !== undefined && Object.keys(data.hs_yj751_pd_appshow_addr).length > 0) {
      Object.assign(this.quota.hs_yj751_pd_appshow_addr, data.hs_yj751_pd_appshow_addr);
      this.updatePdValues(data.hs_yj751_pd_appshow_addr);
    }
    // if (
    //   data.hs_yj751_pd_app_set_info_addr !== undefined &&
    //   Object.keys(data.hs_yj751_pd_app_set_info_addr).length > 0
    // ) {
    //   Object.assign(this.quota.hs_yj751_pd_app_set_info_addr, data.hs_yj751_pd_app_set_info_addr);
    //   this.updatePdSetValues(data.hs_yj751_pd_app_set_info_addr);
    // }
  }

  protected override initializeQuota(quota: DeltaProUltraAllQuotaData | null): DeltaProUltraAllQuotaData {
    const result = quota ?? ({} as DeltaProUltraAllQuotaData);
    if (!result.hs_yj751_pd_app_set_info_addr) {
      result.hs_yj751_pd_app_set_info_addr = {};
    }
    if (!result.hs_yj751_pd_appshow_addr) {
      result.hs_yj751_pd_appshow_addr = {};
    }
    return result;
  }

  protected override updateInitialValues(data: DeltaProUltraAllQuotaData): void {
    const message: DeltaProUltraMqttQuotaMessageWithParams<DeltaProUltraAllQuotaData> = {
      data,
    };
    this.processQuotaMessage(message);
  }

  private updatePdValues(params: PdStatus): void {
    this.updateBatteryLevelValues(params);
    this.updateChargingStateValues(params);
    this.updatePdAcValues(params);
    this.updatePdUsbValues(params);
  }

  // private updatePdSetValues(params: PdSetStatus): void {
  //   if (params.acXboost !== undefined && params.acXboost !== AcXBoostType.Ignore) {
  //     this.switchXboostService.updateState(params.acXboost === AcXBoostType.On);
  //   }
  // }

  private updateBatteryLevelValues(params: PdStatusSoc): void {
    if (params.soc !== undefined) {
      this.batteryStatusService.updateBatteryLevel(params.soc);
      this.outletAcService.updateBatteryLevel(params.soc);
      this.outletUsbService.updateBatteryLevel(params.soc);
    }
  }

  private updateChargingStateValues(params: PdStatusWatts): void {
    if (params.wattsInSum !== undefined) {
      const isCharging =
        params.wattsInSum > 0 && (params.wattsOutSum === undefined || params.wattsInSum !== params.wattsOutSum);
      this.batteryStatusService.updateChargingState(isCharging);
      this.outletAcService.updateInputConsumption(params.wattsInSum);
      this.outletUsbService.updateInputConsumption(params.wattsInSum);
    }
  }

  private updatePdAcValues(params: PdStatusAc): void {
    // if (params.acOutState !== undefined) {
    //   this.outletAcService.updateState(params.acOutState === EnableType.On);
    // }
    if (
      params.outAcL11Pwr !== undefined ||
      params.outAcL12Pwr !== undefined ||
      params.outAcL21Pwr !== undefined ||
      params.outAcL22Pwr !== undefined ||
      params.outAcTtPwr !== undefined ||
      params.outAcL14Pwr !== undefined ||
      params.outAc5p8Pwr !== undefined
    ) {
      const usbWatts = this.sum(
        params.outAcL11Pwr,
        params.outAcL12Pwr,
        params.outAcL21Pwr,
        params.outAcL22Pwr,
        params.outAcTtPwr,
        params.outAcL14Pwr,
        params.outAc5p8Pwr
      );
      this.outletAcService.updateOutputConsumption(usbWatts);
    }
  }

  private updatePdUsbValues(params: PdStatusUsb): void {
    // if (params.dcOutState !== undefined) {
    //   this.outletUsbService.updateState(params.dcOutState === EnableType.On);
    // }
    if (
      params.outUsb1Pwr !== undefined ||
      params.outUsb2Pwr !== undefined ||
      params.outTypec1Pwr !== undefined ||
      params.outTypec2Pwr !== undefined
    ) {
      const usbWatts = this.sum(params.outUsb1Pwr, params.outUsb2Pwr, params.outTypec1Pwr, params.outTypec2Pwr);
      this.outletUsbService.updateOutputConsumption(usbWatts);
    }
  }
}
