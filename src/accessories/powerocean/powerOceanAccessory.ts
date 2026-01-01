import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { PowerOceanAllQuotaData } from '@ecoflow/accessories/powerocean/interfaces/powerOceanHttpApiContracts';
import { PowerOceanMqttQuotaMessageWithParams } from '@ecoflow/accessories/powerocean/interfaces/powerOceanMqttApiContracts';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceConfig } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { OutletReadOnlyService } from '@ecoflow/services/outletReadOnlyService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

export class PowerOceanAccessory extends EcoFlowAccessoryWithQuotaBase<PowerOceanAllQuotaData> {
  private readonly inverterOutletService: OutletReadOnlyService;
  private readonly solarOutletService: OutletReadOnlyService;
  private readonly batteryOutletService: OutletReadOnlyService;

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

    this.inverterOutletService = new OutletReadOnlyService(this, batteryStatusProvider, 'INV', config.powerOcean?.inverterAdditionalCharacteristics);
    this.solarOutletService = new OutletReadOnlyService(this, batteryStatusProvider, 'PV', config.powerOcean?.pvAdditionalCharacteristics);
    this.batteryOutletService = new OutletReadOnlyService(this, batteryStatusProvider, 'BAT', config.powerOcean?.batteryAdditionalCharacteristics);
  }

  protected override getServices(): ServiceBase[] {
    return [this.inverterOutletService, this.solarOutletService, this.batteryOutletService];
  }

  protected override processQuotaMessage(message: MqttQuotaMessage): void {
    const params = (message as PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData>).params;
    if (params === undefined) {
      return;
    }
    if (params.bpPwr !== undefined) {
      this.quota.bpPwr = params.bpPwr;
    }
    if (params.bpSoc !== undefined) {
      this.quota.bpSoc = params.bpSoc;
    }
    if (params.evPwr !== undefined) {
      this.quota.evPwr = params.evPwr;
    }
    if (params.sysGridPwr !== undefined) {
      this.quota.sysGridPwr = params.sysGridPwr;
    }
    if (params.sysLoadPwr !== undefined) {
      this.quota.sysLoadPwr = params.sysLoadPwr;
    }
    this.updateValues(params);
  }

  protected override initializeQuota(quota: PowerOceanAllQuotaData | null): PowerOceanAllQuotaData {
    const result = quota ?? ({} as PowerOceanAllQuotaData);
    return result;
  }

  protected override updateInitialValues(initialData: PowerOceanAllQuotaData): void {
    const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
      params: initialData,
    };
    this.processQuotaMessage(message);
  }

  private updateValues(params: PowerOceanAllQuotaData): void {
    this.updateSolarValues(params);
    this.updateBatteryValues(params);
    this.updateInverterValues(params);
  }

  private updateSolarValues(params: PowerOceanAllQuotaData): void {
    if (params.evPwr !== undefined) {
      this.solarOutletService.updateState(params.evPwr > 0);
      this.solarOutletService.updateOutputConsumption(params.evPwr);
    }
  }

  private updateBatteryValues(params: PowerOceanAllQuotaData): void {
    if (params.bpPwr !== undefined) {
      if (params.bpPwr >= 0) {
        this.batteryOutletService.updateState(params.bpPwr > 0);
        this.batteryOutletService.updateChargingState(false);
        this.batteryOutletService.updateOutputConsumption(params.bpPwr);
      }
      if (params.bpPwr <= 0) {
        const watts = Math.abs(params.bpPwr);
        this.batteryOutletService.updateChargingState(watts > 0);
        this.batteryOutletService.updateInputConsumption(watts);
      }
    }
    if (params.bpSoc !== undefined) {
      this.batteryOutletService.updateBatteryLevel(params.bpSoc, 20);
    }
  }

  private updateInverterValues(params: PowerOceanAllQuotaData): void {
    if (params.sysLoadPwr !== undefined) {
      this.inverterOutletService.updateOutputConsumption(params.sysLoadPwr);
      this.inverterOutletService.updateState(true);
    }

    if (params.sysGridPwr !== undefined) {
      this.inverterOutletService.updateInputConsumption(params.sysGridPwr);
    }
  }
}
