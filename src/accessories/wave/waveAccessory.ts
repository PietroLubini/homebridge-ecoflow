import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import {
  BmsStatus,
  PdStatus,
  PdStatusAnalysisPd,
  PdStatusDev,
  PowerStatus,
  WaveAllQuotaData,
  WaveMainModeType,
  WavePowerModeType,
} from '@ecoflow/accessories/wave/interfaces/waveHttpApiContracts';
import {
  WaveAnalysisPdQuotaParams,
  WaveMqttMessageTypeCodeType,
  WaveMqttQuotaMessage,
  WaveMqttQuotaMessageWithParams,
} from '@ecoflow/accessories/wave/interfaces/waveMqttApiContracts';
import { FanModeService } from '@ecoflow/accessories/wave/services/fanModeService';
import { ThermostatAirConditionerService } from '@ecoflow/accessories/wave/services/thermostatAirConditionerService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { TargetHeatingCoolingStateType, TemperatureDisplayUnitsType } from '@ecoflow/characteristics/characteristicContracts';
import { DeviceConfig } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { Converter } from '@ecoflow/helpers/converter';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { OutletReadOnlyService } from '@ecoflow/services/outletReadOnlyService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

export class WaveAccessory extends EcoFlowAccessoryWithQuotaBase<WaveAllQuotaData> {
  private readonly batteryStatusService: BatteryStatusService;
  private readonly outletBatteryService: OutletReadOnlyService;
  private readonly thermostatAirConditionerService: ThermostatAirConditionerService;
  private readonly fanModeService: FanModeService;

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
    this.outletBatteryService = new OutletReadOnlyService(this, batteryStatusProvider, 'Battery', config.battery?.additionalCharacteristics);
    this.thermostatAirConditionerService = new ThermostatAirConditionerService(this);
    this.fanModeService = new FanModeService(this);
  }

  protected override getServices(): ServiceBase[] {
    return [this.batteryStatusService, this.outletBatteryService, this.thermostatAirConditionerService, this.fanModeService];
  }

  protected override processQuotaMessage(message: MqttQuotaMessage): void {
    const waveMessage = message as WaveMqttQuotaMessage;
    if (waveMessage.typeCode === WaveMqttMessageTypeCodeType.BMS) {
      const bmsParams = (message as WaveMqttQuotaMessageWithParams<BmsStatus>).params;
      Object.assign(this.quota.bms, bmsParams);
      this.updateBmsValues(this.quota.bms);
    } else if (waveMessage.typeCode === WaveMqttMessageTypeCodeType.POWER) {
      const powerParams = (message as WaveMqttQuotaMessageWithParams<PowerStatus>).params;
      Object.assign(this.quota.power, powerParams);
      this.updatePowerValues(this.quota.power);
    } else if (waveMessage.typeCode === WaveMqttMessageTypeCodeType.PD) {
      const pdParams = (message as WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams>).params;
      this.quota.pd.mainMode = pdParams.pdMainMode;
      this.quota.pd.tempSys = pdParams.pdTempSys;
      this.quota.pd.fanValue = pdParams.setFanVal;
      this.quota.pd.tempDisplay = pdParams.lcdStatus;
      this.quota.pd.waterValue = pdParams.waterValue;
      this.quota.pd.powerMode = pdParams.powerSts;
      this.quota.pd.setTemp =
        pdParams.pdTempSys === undefined
          ? undefined
          : pdParams.pdTempSys === TemperatureDisplayUnitsType.Celsius
            ? pdParams.setTempCel
            : Converter.convertFahrenheitToCelsius(pdParams.setTempfah);
      this.updatePdValues(this.quota.pd);
    } else if (waveMessage.typeCode === WaveMqttMessageTypeCodeType.PD_DEV) {
      const pdDevParams = (message as WaveMqttQuotaMessageWithParams<PdStatusDev>).params;
      this.quota.pd.coolTemp = pdDevParams.coolTemp;
      this.quota.pd.envTemp = pdDevParams.envTemp;
      this.updatePdDevValues(this.quota.pd);
    }
  }

  protected override initializeQuota(quota: WaveAllQuotaData | null): WaveAllQuotaData {
    const result = quota ?? ({} as WaveAllQuotaData);
    if (!result.bms) {
      result.bms = {};
    }
    if (!result.pd) {
      result.pd = {};
    }
    if (!result.power) {
      result.power = {};
    }
    return result;
  }

  protected override updateInitialValues(initialData: WaveAllQuotaData): void {
    this.updateBmsInitialValues(initialData.bms);
    this.updatePdInitialValues(initialData.pd);
    this.updatePowerInitialValues(initialData.power);
  }

  private updateBmsInitialValues(params: BmsStatus): void {
    const message: WaveMqttQuotaMessageWithParams<BmsStatus> = {
      typeCode: WaveMqttMessageTypeCodeType.BMS,
      params: params,
    };
    this.processQuotaMessage(message);
  }

  private updatePdInitialValues(params: PdStatus): void {
    const pdMessage: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
      typeCode: WaveMqttMessageTypeCodeType.PD,
      params: {
        pdMainMode: params.mainMode,
        pdTempSys: params.tempSys,
        setFanVal: params.fanValue,
        lcdStatus: params.tempDisplay,
        waterValue: params.waterValue,
        powerSts: params.powerMode,
        setTempCel: params.tempSys === TemperatureDisplayUnitsType.Celsius ? params.setTemp : undefined,
        setTempfah: params.tempSys === TemperatureDisplayUnitsType.Fahrenheit ? params.setTemp : undefined,
      },
    };
    this.processQuotaMessage(pdMessage);
    const pdDevMessage: WaveMqttQuotaMessageWithParams<PdStatusDev> = {
      typeCode: WaveMqttMessageTypeCodeType.PD_DEV,
      params: {
        coolTemp: params.coolTemp,
        envTemp: params.envTemp,
      },
    };
    this.processQuotaMessage(pdDevMessage);
  }

  private updatePowerInitialValues(params: PowerStatus): void {
    const message: WaveMqttQuotaMessageWithParams<PowerStatus> = {
      typeCode: WaveMqttMessageTypeCodeType.POWER,
      params: params,
    };
    this.processQuotaMessage(message);
  }

  private updateBmsValues(params: BmsStatus): void {
    if (params.bmsSoc !== undefined && params.bmsMinDsgSoc !== undefined) {
      this.batteryStatusService.updateBatteryLevel(params.bmsSoc, params.bmsMinDsgSoc);
      this.outletBatteryService.updateBatteryLevel(params.bmsSoc, params.bmsMinDsgSoc);
    }
  }

  private updatePdValues(params: PdStatusAnalysisPd): void {
    this.updateAirConditionerModeValues(params);
    this.updateFanModeValues(params);
    this.updateAirConditionerStateValues(params);
  }

  private updateAirConditionerModeValues(params: PdStatusAnalysisPd): void {
    if (params.mainMode !== undefined && params.powerMode !== undefined) {
      if (params.powerMode === WavePowerModeType.Off) {
        this.thermostatAirConditionerService.updateTargetState(TargetHeatingCoolingStateType.Off);
        this.fanModeService.updateState(false);
      } else if (params.mainMode === WaveMainModeType.Fan) {
        this.thermostatAirConditionerService.updateTargetState(TargetHeatingCoolingStateType.Auto);
        this.fanModeService.updateState(true);
      } else {
        this.thermostatAirConditionerService.updateTargetState(
          params.mainMode === WaveMainModeType.Cool ? TargetHeatingCoolingStateType.Cool : TargetHeatingCoolingStateType.Heat
        );
        this.fanModeService.updateState(false);
      }
    }
  }

  private updateFanModeValues(params: PdStatusAnalysisPd): void {
    if (params.fanValue !== undefined) {
      this.fanModeService.updatePositionedRotationSpeed(params.fanValue);
    }
  }

  private updateAirConditionerStateValues(params: PdStatusAnalysisPd): void {
    if (params.tempSys !== undefined) {
      this.thermostatAirConditionerService.updateTemperatureDisplayUnits(params.tempSys);
    }
    if (params.setTemp !== undefined) {
      this.thermostatAirConditionerService.updateTargetTemperature(params.setTemp);
    }
    // if (params.tempDisplay !== undefined) {
    //   // TODO
    // }
    // if (params.waterValue !== undefined) {
    //   // TODO
    // }
  }

  private updatePdDevValues(params: PdStatusDev): void {
    if (params.envTemp !== undefined) {
      this.thermostatAirConditionerService.updateCurrentTemperature(params.envTemp);
    }
  }

  private updatePowerValues(params: PowerStatus): void {
    if (params.acPwrIn !== undefined) {
      const isCharging = params.acPwrIn > 0 && (params.batPwrOut === undefined || params.acPwrIn !== params.batPwrOut);
      this.batteryStatusService.updateChargingState(isCharging);
      this.outletBatteryService.updateChargingState(isCharging);
      this.outletBatteryService.updateInputConsumption(params.acPwrIn);
    }
    if (params.batPwrOut !== undefined) {
      this.outletBatteryService.updateState(params.batPwrOut > 0);
      this.outletBatteryService.updateOutputConsumption(params.batPwrOut);
    }
    if (params.batCurr !== undefined) {
      this.outletBatteryService.updateOutputCurrent(params.batCurr * 0.001);
    }
    if (params.batVolt !== undefined) {
      this.outletBatteryService.updateOutputVoltage(params.batVolt * 0.01);
    }
  }
}
