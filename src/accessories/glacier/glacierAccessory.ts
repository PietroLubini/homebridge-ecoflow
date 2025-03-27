import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import {
  BmsStatus,
  EmsStatus,
  GlacierAllQuotaData,
  PdStatus,
} from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  GlacierMqttMessageType,
  GlacierMqttQuotaMessage,
  GlacierMqttQuotaMessageWithParams,
} from '@ecoflow/accessories/glacier/interfaces/glacierMqttApiContracts';
import { ThermostatService } from '@ecoflow/accessories/glacier/services/thermostatService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage, MqttQuotaMessageWithParams } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceConfig } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

export class GlacierAccessory extends EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData> {
  private readonly batteryStatusService: BatteryStatusService;
  private readonly thermostatService: ThermostatService;
  // private readonly switchXboostService: SwitchXboostService;

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
    this.thermostatService = new ThermostatService(this);
    // this.switchXboostService = new SwitchXboostService(this, configuration.setAcModuleType);
  }

  protected override getServices(): ServiceBase[] {
    return [
      this.batteryStatusService,
      this.thermostatService,
      // this.switchXboostService,
    ];
  }

  protected override processQuotaMessage(message: MqttQuotaMessage): void {
    const glacierMessage = message as GlacierMqttQuotaMessage;
    if (glacierMessage.typeCode === GlacierMqttMessageType.EMS) {
      const emsStatus = (message as MqttQuotaMessageWithParams<EmsStatus>).params;
      Object.assign(this.quota.bms_emsStatus, emsStatus);
      this.updateEmsValues(emsStatus);
    } else if (glacierMessage.typeCode === GlacierMqttMessageType.BMS) {
      const bmsStatus = (message as MqttQuotaMessageWithParams<BmsStatus>).params;
      Object.assign(this.quota.bms_bmsStatus, bmsStatus);
      this.updateBmsValues(bmsStatus);
    } else if (glacierMessage.typeCode === GlacierMqttMessageType.PD) {
      const pdStatus = (message as MqttQuotaMessageWithParams<PdStatus>).params;
      Object.assign(this.quota.pd, pdStatus);
      this.updatePdValues(pdStatus);
    }
  }

  protected override initializeQuota(quota: GlacierAllQuotaData | null): GlacierAllQuotaData {
    const result = quota ?? ({} as GlacierAllQuotaData);
    if (!result.bms_emsStatus) {
      result.bms_emsStatus = {};
    }
    if (!result.bms_bmsStatus) {
      result.bms_bmsStatus = {};
    }
    if (!result.pd) {
      result.pd = {};
    }
    return result;
  }

  protected override updateInitialValues(initialData: GlacierAllQuotaData): void {
    this.updateEmsInitialValues(initialData.bms_emsStatus);
    this.updateBmsInitialValues(initialData.bms_bmsStatus);
    this.updatePdInitialValues(initialData.pd);
  }

  private updateEmsInitialValues(params: EmsStatus): void {
    const message: GlacierMqttQuotaMessageWithParams<EmsStatus> = {
      typeCode: GlacierMqttMessageType.EMS,
      params,
    };
    this.processQuotaMessage(message);
  }

  private updateBmsInitialValues(params: BmsStatus): void {
    const message: GlacierMqttQuotaMessageWithParams<BmsStatus> = {
      typeCode: GlacierMqttMessageType.BMS,
      params,
    };
    this.processQuotaMessage(message);
  }

  private updatePdInitialValues(params: PdStatus): void {
    const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
      typeCode: GlacierMqttMessageType.PD,
      params,
    };
    this.processQuotaMessage(message);
  }

  private updateEmsValues(params: EmsStatus): void {
    if (params.lcdSoc !== undefined && params.minDsgSoc !== undefined) {
      this.batteryStatusService.updateBatteryLevel(params.lcdSoc, params.minDsgSoc);
    }
  }

  private updateBmsValues(params: BmsStatus): void {
    if (params.inWatts !== undefined) {
      const isCharging = params.inWatts > 0 && (params.outWatts === undefined || params.inWatts !== params.outWatts);
      this.batteryStatusService.updateChargingState(isCharging);
      // this.outletAcService.updateChargingState(isCharging);
      // this.outletAcService.updateInputConsumption(params.inputWatts);
    }
    if (params.outWatts !== undefined) {
      // this.outletAcService.updateOutputConsumption(params.outWatts);
    }
  }

  private updatePdValues(params: PdStatus): void {}
}
