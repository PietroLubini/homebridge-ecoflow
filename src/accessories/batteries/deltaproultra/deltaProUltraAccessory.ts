import {
  DeltaProUltraAllQuotaData,
  PdSetStatus,
  PdStatus,
  PdStatusAc,
  PdStatusSoc,
  PdStatusUsb,
  PdStatusWatts,
} from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraHttpApiContracts';
import {
  DeltaProUltraMqttMessageAddrType,
  DeltaProUltraMqttQuotaMessage,
  DeltaProUltraMqttQuotaMessageWithParams,
} from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraMqttApiContracts';
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
    const accessoryMessage = message as DeltaProUltraMqttQuotaMessage;
    if (accessoryMessage.addr === DeltaProUltraMqttMessageAddrType.PD) {
      const pdStatus = (message as DeltaProUltraMqttQuotaMessageWithParams<PdStatus>).param;
      Object.assign(this.quota.hs_yj751_pd_appshow_addr, pdStatus);
      this.updatePdValues(pdStatus);
    } else if (accessoryMessage.addr === DeltaProUltraMqttMessageAddrType.PD_SET) {
      const pdSetStatus = (message as DeltaProUltraMqttQuotaMessageWithParams<PdSetStatus>).param;
      Object.assign(this.quota.hs_yj751_pd_app_set_info_addr, pdSetStatus);
      // this.updatePdSetValues(pdSetStatus);
    }
  }

  protected override initializeQuota(quota: DeltaProUltraAllQuotaData | null): DeltaProUltraAllQuotaData {
    const result = quota ?? ({} as DeltaProUltraAllQuotaData);
    if (!result.hs_yj751_pd_appshow_addr) {
      result.hs_yj751_pd_appshow_addr = {};
    }
    if (!result.hs_yj751_pd_app_set_info_addr) {
      result.hs_yj751_pd_app_set_info_addr = {};
    }
    return result;
  }

  protected override updateInitialValues(initialData: DeltaProUltraAllQuotaData): void {
    this.updatePdStatusInitialValues(initialData.hs_yj751_pd_appshow_addr);
    this.updatePdSetStatusInitialValues(initialData.hs_yj751_pd_app_set_info_addr);
  }

  private updatePdStatusInitialValues(params: PdStatus): void {
    const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
      param: params,
      addr: DeltaProUltraMqttMessageAddrType.PD,
    };
    this.processQuotaMessage(message);
  }

  private updatePdSetStatusInitialValues(params: PdSetStatus): void {
    const message: DeltaProUltraMqttQuotaMessageWithParams<PdSetStatus> = {
      param: params,
      addr: DeltaProUltraMqttMessageAddrType.PD_SET,
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
