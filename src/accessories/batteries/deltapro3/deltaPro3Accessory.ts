import {
  DeltaPro3AcEnableType,
  DeltaPro3AllQuotaData,
} from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3HttpApiContracts';
import { DeltaPro3MqttQuotaMessage } from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3MqttApiContracts';
import { OutletAcHvService } from '@ecoflow/accessories/batteries/deltapro3/services/outletAcHvService';
import { OutletAcLvService } from '@ecoflow/accessories/batteries/deltapro3/services/outletAcLvService';
import { OutletDc12vService } from '@ecoflow/accessories/batteries/deltapro3/services/outletDc12vService';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceConfig } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

export class DeltaPro3Accessory extends EcoFlowAccessoryWithQuotaBase<DeltaPro3AllQuotaData> {
  private readonly batteryStatusService: BatteryStatusService;
  private readonly outletAcHvService: OutletAcHvService;
  private readonly outletAcLvService: OutletAcLvService;
  private readonly outletDc12vService: OutletDc12vService;
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
    this.outletAcHvService = new OutletAcHvService(this, batteryStatusProvider);
    this.outletAcLvService = new OutletAcLvService(this, batteryStatusProvider);
    this.outletDc12vService = new OutletDc12vService(this, batteryStatusProvider);
    // this.switchXboostService = new SwitchXboostService(this);
  }

  protected override getServices(): ServiceBase[] {
    return [
      this.batteryStatusService,
      this.outletAcHvService,
      this.outletAcLvService,
      this.outletDc12vService,
      // X-boost status:
      //   - Set ON/OFF - WORKS
      //   - Read initial value - WORKS
      //   - Receive updates about changes inside Ecoflow App - DOES NOT WORK (no mqtt quota messages about X-Boost changes)
      // this.switchXboostService,
    ];
  }

  protected override processQuotaMessage(message: MqttQuotaMessage): void {
    const data = message as DeltaPro3MqttQuotaMessage;
    Object.assign(this.quota, data);
    this.updateSocValues(data);
    this.updateInputWattsValues(data);
    this.updateOutputWattsValues(data);
    this.updateSwitchStateValues(data);
  }

  protected override initializeQuota(quota: DeltaPro3AllQuotaData | null): DeltaPro3AllQuotaData {
    const result = quota ?? ({} as DeltaPro3AllQuotaData);
    return result;
  }

  protected override updateInitialValues(data: DeltaPro3AllQuotaData): void {
    this.processQuotaMessage(data);
  }

  private updateSocValues(params: DeltaPro3MqttQuotaMessage): void {
    if (params.cmsBattSoc !== undefined && params.cmsMinDsgSoc !== undefined) {
      this.batteryStatusService.updateBatteryLevel(params.cmsBattSoc, params.cmsMinDsgSoc);
      this.outletAcHvService.updateBatteryLevel(params.cmsBattSoc, params.cmsMinDsgSoc);
      this.outletAcLvService.updateBatteryLevel(params.cmsBattSoc, params.cmsMinDsgSoc);
      this.outletDc12vService.updateBatteryLevel(params.cmsBattSoc, params.cmsMinDsgSoc);
    }
  }

  private updateInputWattsValues(params: DeltaPro3MqttQuotaMessage): void {
    if (params.inputWatts !== undefined) {
      const isCharging =
        params.inputWatts > 0 && (params.outputWatts === undefined || params.inputWatts !== params.outputWatts);
      this.batteryStatusService.updateChargingState(isCharging);
      this.outletAcHvService.updateChargingState(isCharging);
      this.outletAcLvService.updateChargingState(isCharging);
      this.outletDc12vService.updateChargingState(isCharging);
      this.outletAcHvService.updateInputConsumption(params.inputWatts);
      this.outletAcLvService.updateInputConsumption(params.inputWatts);
      this.outletDc12vService.updateInputConsumption(params.inputWatts);
    }
  }

  private updateOutputWattsValues(params: DeltaPro3MqttQuotaMessage): void {
    if (params.powGetAcHvOut !== undefined) {
      this.outletAcHvService.updateOutputConsumption(Math.abs(params.powGetAcHvOut));
    }
    if (params.powGetAcLvOut !== undefined) {
      this.outletAcLvService.updateOutputConsumption(Math.abs(params.powGetAcLvOut));
    }
    if (params.powGet12v !== undefined) {
      this.outletDc12vService.updateOutputConsumption(Math.abs(params.powGet12v));
    }
  }

  private updateSwitchStateValues(params: DeltaPro3MqttQuotaMessage): void {
    if (params.flowInfoAcHvOut !== undefined && params.flowInfoAcHvOut !== DeltaPro3AcEnableType.Ignore) {
      this.outletAcHvService.updateState(params.flowInfoAcHvOut === DeltaPro3AcEnableType.On);
    }
    if (params.flowInfoAcLvOut !== undefined && params.flowInfoAcLvOut !== DeltaPro3AcEnableType.Ignore) {
      this.outletAcLvService.updateState(params.flowInfoAcLvOut === DeltaPro3AcEnableType.On);
    }
    if (params.flowInfo12v !== undefined && params.flowInfo12v !== DeltaPro3AcEnableType.Ignore) {
      this.outletDc12vService.updateState(params.flowInfo12v === DeltaPro3AcEnableType.On);
    }
    // if (params.xboostEn !== undefined && params.xboostEn !== AcXBoostType.Ignore) {
    //   this.switchXboostService.updateState(params.xboostEn === AcXBoostType.On);
    // }
  }
}
