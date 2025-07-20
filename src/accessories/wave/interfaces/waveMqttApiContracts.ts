import {
  WaveDrainageModeType,
  WaveDrainageWaterLevelType,
  WaveFanSpeedType,
  WaveMainModeType,
  WavePowerModeType,
  WaveTemperatureDisplayType,
} from '@ecoflow/accessories/wave/interfaces/waveHttpApiContracts';
import {
  MqttQuotaMessage,
  MqttQuotaMessageWithParams,
  MqttSetMessage,
  MqttSetMessageWithParams,
} from '@ecoflow/apis/interfaces/mqttApiContracts';
import { TemperatureDisplayUnitsType } from '@ecoflow/characteristics/characteristicContracts';

export enum WaveMqttMessageTypeCodeType {
  BMS = 'analysisBMS',
  PD = 'analysisPD',
  PD_DEV = 'devStatus',
  POWER = 'analysisPOWER',
}

export interface WaveAnalysisPdQuotaParams {
  pdMainMode?: WaveMainModeType; // PdStatusAnalysisPd.mainMode
  pdTempSys?: TemperatureDisplayUnitsType; // PdStatusAnalysisPd.tempSys
  setFanVal?: WaveFanSpeedType; // PdStatusAnalysisPd.fanValue
  lcdStatus?: WaveTemperatureDisplayType; // PdStatusAnalysisPd.tempDisplay
  waterValue?: WaveDrainageWaterLevelType; // PdStatusAnalysisPd.waterValue
  powerSts?: WavePowerModeType; // PdStatusAnalysisPd.powerMode
  setTempCel?: number; // PdStatusAnalysisPd.setTemp (Temperature in Celsius)
  setTempfah?: number; // PdStatusAnalysisPd.setTemp (Temperature in Fahrenheit)
}

export interface WaveMqttQuotaMessage extends MqttQuotaMessage {
  typeCode: WaveMqttMessageTypeCodeType;
}

export interface WaveMqttQuotaMessageWithParams<TParams>
  extends MqttQuotaMessageWithParams<TParams>,
    WaveMqttQuotaMessage {}

export enum WaveMqttSetOperateType {
  MainMode = 'mainMode',
  TemperatureUnit = 'tempSys',
  SetTemperature = 'setTemp',
  DisplayTemparatureMode = 'tempDisplay',
  FanSpeedMode = 'fanValue',
  DrainageMode = 'wteFthEn',
  AmbientLightMode = 'rgbState',
  PowerMode = 'powerMode',
}

export enum WaveMqttSetModuleType {
  Default = 1,
}

export interface WaveMqttSetMessage extends MqttSetMessage {
  moduleType: WaveMqttSetModuleType;
  operateType: WaveMqttSetOperateType;
}

export interface WaveMqttSetMessageParams {}

export interface WaveMqttSetMessageWithParams<TParams extends WaveMqttSetMessageParams>
  extends MqttSetMessageWithParams<TParams>,
    WaveMqttSetMessage {}

export interface WaveMqttSetMainModeMessageParams extends WaveMqttSetMessageParams {
  mainMode: WaveMainModeType;
}

export interface WaveMqttSetTemperatureUnitMessageParams extends WaveMqttSetMessageParams {
  mode: TemperatureDisplayUnitsType;
}

export interface WaveMqttSetTemperatureMessageParams extends WaveMqttSetMessageParams {
  setTemp: number; // 16-30 ℃
}

export interface WaveMqttSetTemperatureDisplayMessageParams extends WaveMqttSetMessageParams {
  tempDisplay: WaveTemperatureDisplayType;
}

export interface WaveMqttSetFanSpeedMessageParams extends WaveMqttSetMessageParams {
  fanValue: WaveFanSpeedType;
}

export interface WaveMqttSetDrainageModeMessageParams extends WaveMqttSetMessageParams {
  wteFthEn: WaveDrainageModeType;
}

export interface WaveMqttSetTemperatureDisplayMessageParams extends WaveMqttSetMessageParams {
  rgbState: WaveTemperatureDisplayType;
}

export interface WaveMqttSetPowerModeMessageParams extends WaveMqttSetMessageParams {
  powerMode: WavePowerModeType;
}
