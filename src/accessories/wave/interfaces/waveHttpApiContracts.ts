// pd.batChgStatus int Battery charging/discharging status
import { TemperatureDisplayUnitsType } from '@ecoflow/characteristics/characteristicContracts';
export enum WavePowerModeType {
  On = 1,
  Off = 2,
}

export enum WaveMainModeType {
  Cool = 0,
  Heat = 1,
  Fan = 2,
}

export enum WaveFanSpeedType {
  Low = 0,
  Medium = 1,
  High = 2,
}

export enum WaveDrainageWaterLevelType {
  Level1 = 0,
  Level2 = 1,
  Full = 2,
}

export enum WaveTemperatureDisplayType {
  Ambient = 0,
  AirOutlet = 1,
}

export enum WaveDrainageCoolModeType {
  ManualDrainage = 0,
  NoDrainage = 1,
  ManualDrainageOff = 2,
  NoDrainageOff = 3,
}

export enum WaveDrainageHeatModeType {
  Off = 0,
  ManualDrainage = 1,
  ManualDrainageOff = 3,
}

export type WaveDrainageModeType = WaveDrainageCoolModeType | WaveDrainageHeatModeType;

export enum WaveAmbientLightingType {
  FollowScreen = 0,
  AlwaysOn = 1,
  AlwaysOff = 2,
}

// Battery management system status
export interface BmsStatus {
  bmsSoc?: number; //Battery level (read)
  bmsMinDsgSoc?: number; //Discharge limit (read)
}

export interface PdStatusAnalysisPd {
  mainMode?: WaveMainModeType; // Main mode: 0: Cool; 1: Heat; 2: Fan (read/write)
  tempSys?: TemperatureDisplayUnitsType; // Unit of temperature: 0: Celsius; 1: Fahrenheit (read/write)
  fanValue?: WaveFanSpeedType; // Wind speed in the current mode: 0: Low; 1: Medium; 2: High (read/write)
  tempDisplay?: WaveTemperatureDisplayType; // Temperature display: 0: Display ambient temperature; 1: Display air outlet temperature (read/write)
  waterValue?: WaveDrainageWaterLevelType; // Water level: 0: Level 1; 1: Level 2; 2: Full (read)
  powerMode?: WavePowerModeType; //Remotely power on/off: 1: on; 2: off (read/write)
  setTemp?: number; // Temperature set in current mode (16-30 ℃) (read/write)
}

export interface PdStatusDev {
  coolTemp?: number; // Air outlet temperature (read)
  envTemp?: number; // Ambient temperature (read)
}

export interface PdStatus extends PdStatusAnalysisPd, PdStatusDev {
  rgbState?: WaveAmbientLightingType; // Light strip settings: 0: Follow the screen; 1: Always on; 2: Always off (read/write)
  // Automatic drainage (read/write)
  // bit1 (main switch of automatic drainage function): 0: On; 1: Off
  // bit0:
  //    (in Cool/Fan mode): 0: Manual drainage; 1: No drainage
  //    (in Heat mode): 0: Off; 1: Physical drainage
  // In Cool/Fan mode: 0: Turn on Manual drainage，1: Turn on No drainage, 2: Turn off Manual drainage, 3: Turn off No drainage
  // In Heat Mode: 0: Turn off, 1: Turn on Manual drainage，3: Turn off Manual drainage
  wteFthEn?: WaveDrainageModeType;
}

export interface PowerStatus {
  batVolt?: number; //Battery voltage (0.01V) (read)
  batCurr?: number; //Battery current (mA) (read)
  batPwrOut?: number; //Battery output power (W) (read)
  acPwrIn?: number; //AC input power (W) (read)
}

export interface WaveAllQuotaData {
  bms: BmsStatus;
  pd: PdStatus;
  power: PowerStatus;
}
