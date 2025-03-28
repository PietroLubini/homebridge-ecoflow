import { EnableType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import {
  BmsStatus,
  ContactSensorType,
  CoolingZoneType,
  CoolModeType,
  EmsStatus,
  GlacierAllQuotaData,
  PdStatus,
  PdStatusFridgeZones,
  PdStatusIceMaking,
  PdStatusState,
} from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  GlacierMqttMessageType,
  GlacierMqttQuotaMessage,
  GlacierMqttQuotaMessageWithParams,
} from '@ecoflow/accessories/glacier/interfaces/glacierMqttApiContracts';
import { HeaterCoolerFridgeDualLeftZoneService } from '@ecoflow/accessories/glacier/services/heaterCoolerFridgeDualLeftZoneService';
import { OutletBatteryService } from '@ecoflow/accessories/glacier/services/outletBatteryService';
import { SwitchEcoModeService } from '@ecoflow/accessories/glacier/services/switchEcoModeService';
import { ThermostatFridgeDualRightZoneService } from '@ecoflow/accessories/glacier/services/thermostatFridgeDualRightZoneService';
import { ThermostatFridgeSingleZoneService } from '@ecoflow/accessories/glacier/services/thermostatFridgeSingleZoneService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage, MqttQuotaMessageWithParams } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { FridgeStateType } from '@ecoflow/characteristics/characteristicContracts';
import { DeviceConfig } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { ContactSensorService } from '@ecoflow/services/contactSensorService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { StatefulProgSwitchService } from '@ecoflow/services/statefullProgSwitchServiceBase';
import { Logging, PlatformAccessory } from 'homebridge';

export class GlacierAccessory extends EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData> {
  private readonly batteryStatusService: BatteryStatusService;
  private readonly fridgeDualLeftZoneService: HeaterCoolerFridgeDualLeftZoneService;
  private readonly fridgeDualRightZoneService: ThermostatFridgeDualRightZoneService;
  private readonly fridgeSingleZoneService: ThermostatFridgeSingleZoneService;
  private readonly switchEcoModeService: SwitchEcoModeService;
  private readonly contactSensorDoorService: ContactSensorService;
  private readonly outletBatteryService: OutletBatteryService;
  private readonly statefulProgSwitchService: StatefulProgSwitchService;

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
    this.fridgeDualLeftZoneService = new HeaterCoolerFridgeDualLeftZoneService(this);
    this.fridgeDualRightZoneService = new ThermostatFridgeDualRightZoneService(this);
    this.fridgeSingleZoneService = new ThermostatFridgeSingleZoneService(this);
    this.switchEcoModeService = new SwitchEcoModeService(this);
    this.contactSensorDoorService = new ContactSensorService(this, 'Door');
    this.outletBatteryService = new OutletBatteryService(this, batteryStatusProvider);
    this.statefulProgSwitchService = new StatefulProgSwitchService(this, 'Make Ice');
  }

  protected override getServices(): ServiceBase[] {
    return [
      this.batteryStatusService,
      this.fridgeDualLeftZoneService,
      this.fridgeDualRightZoneService,
      this.fridgeSingleZoneService,
      this.switchEcoModeService,
      this.contactSensorDoorService,
      this.outletBatteryService,
      this.statefulProgSwitchService,
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
      this.outletBatteryService.updateBatteryLevel(params.lcdSoc, params.minDsgSoc);
    }
  }

  private updateBmsValues(params: BmsStatus): void {
    if (params.inWatts !== undefined) {
      const isCharging = params.inWatts > 0 && (params.outWatts === undefined || params.inWatts !== params.outWatts);
      this.batteryStatusService.updateChargingState(isCharging);
      this.outletBatteryService.updateChargingState(isCharging);
      this.outletBatteryService.updateInputConsumption(params.inWatts);
    }
    if (params.outWatts !== undefined) {
      this.outletBatteryService.updateOutputConsumption(params.outWatts);
    }
  }

  private updatePdValues(params: PdStatus): void {
    this.updateFridgeZonesValues(params);
    this.updateStateValues(params);
    this.updateIceMakingValues(params);
  }

  private updateFridgeZonesValues(params: PdStatusFridgeZones): void {
    if (params.pwrState !== undefined) {
      const coolerState = params.pwrState === EnableType.On ? FridgeStateType.On : FridgeStateType.Off;
      this.fridgeSingleZoneService.updateTargetState(coolerState);
      this.fridgeDualLeftZoneService.updateTargetState(coolerState);
      this.fridgeDualRightZoneService.updateTargetState(coolerState);
      this.outletBatteryService.updateState(params.pwrState === EnableType.On);
    }
    if (params.coolZoneDoubleCount !== undefined && params.coolZoneDoubleCount === CoolingZoneType.Dual) {
      this.changeEnabledServiceState(this.fridgeSingleZoneService, false);
      this.changeEnabledServiceState(this.fridgeDualLeftZoneService, true);
      this.changeEnabledServiceState(this.fridgeDualRightZoneService, true);
    }
    if (params.coolZoneDoubleCount !== undefined && params.coolZoneDoubleCount === CoolingZoneType.Single) {
      this.changeEnabledServiceState(this.fridgeSingleZoneService, true);
      this.changeEnabledServiceState(this.fridgeDualLeftZoneService, false);
      this.changeEnabledServiceState(this.fridgeDualRightZoneService, false);
    }
    if (params.tmpL !== undefined) {
      this.fridgeDualLeftZoneService.updateCurrentTemperature(params.tmpL);
    }
    if (params.tmpR !== undefined) {
      this.fridgeDualRightZoneService.updateCurrentTemperature(params.tmpR);
    }
    if (params.tmpAver !== undefined) {
      this.fridgeSingleZoneService.updateCurrentTemperature(params.tmpAver);
    }
    if (params.tmpLSet !== undefined) {
      this.fridgeDualLeftZoneService.updateTargetTemperature(params.tmpLSet);
    }
    if (params.tmpRSet !== undefined) {
      this.fridgeDualRightZoneService.updateTargetTemperature(params.tmpRSet);
    }
    if (params.tmpMSet !== undefined) {
      this.fridgeSingleZoneService.updateTargetTemperature(params.tmpMSet);
    }
  }

  private updateStateValues(params: PdStatusState): void {
    if (params.coolMode !== undefined) {
      this.switchEcoModeService.updateState(params.coolMode === CoolModeType.Eco);
    }
    if (params.doorStat !== undefined) {
      this.contactSensorDoorService.updateState(params.doorStat === ContactSensorType.Closed);
    }
  }

  private updateIceMakingValues(params: PdStatusIceMaking): void {
    // TODO
  }

  private changeEnabledServiceState(service: ServiceBase, enable: boolean): void {
    service.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .updateValue(enable ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE);
  }
}
