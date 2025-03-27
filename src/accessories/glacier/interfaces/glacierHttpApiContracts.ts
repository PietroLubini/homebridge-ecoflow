import { EnableType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';

export enum CoolingZoneType {
  Single = 1,
  Dual = 2,
}

export enum TemperatureType {
  Celsius = 0,
  Fahrenheit = 1,
}

export enum CoolModeType {
  Normal = 0,
  Eco = 1,
}

export enum IceCubeStatusType {
  SmallInPreparation = 0,
  LargeInPreparation = 1,
  SmallInProgress = 2,
  LargeInProgress = 3,
}

export enum ContactSensorType {
  Closed = 0,
  Opened = 1,
}

// Battery management system status
export interface EmsStatus {
  lcdSoc?: number; //Battery level (%) (read)
  minDsgSoc?: number; //Discharge limit (%) (read)
}

export interface BmsStatus {
  inWatts?: number; //Input power (W) (read)
  outWatts?: number; //Output power (W) (read)
  vol?: number; //Voltage (mV) (read)
  amp?: number; // Current (mA) (read)
}

export interface PdStatusTemperature {
  coolZoneDoubleCount?: CoolingZoneType; //Count of dual temperature zones (read)
  tmpUnit?: TemperatureType; // Temperature type 0: Celsius; 1: Fahrenheit (read)
  tmpR?: number; // Real-time temperature of the right temperature zone, amplified 10 times (read)
  tmpL?: number; // Real-time temperature of the left temperature zone, amplified 10 times (read)
  tmpAver?: number; // Real-time temperature of single temperature zone, amplified 10 times (read)
}

export interface PdStatusState {
  pwrState?: EnableType; //Device state (0: Powered off; 1: Powered on) (read/write)
  coolMode?: CoolModeType; //Cool mode (0: Normal; 1: Eco) (read/write)
  doorStat?: ContactSensorType; //Door status detection (1: Open; 0: Closed) (read)
}

export interface PdStatusIceMaking {
  icePercent?: number; //Ice making progress (%) (read)
  //Large/small ice cube status (read/write)
  // 0: Small ice cube (in preparation);
  // 1: Large ice cube (in preparation);
  // 2: Small ice cube (ice making in progress; cannot be changed);
  // 3: Large ice cube (ice making in progress)
  iceMkMode?: IceCubeStatusType;
}

export interface PdStatus extends PdStatusTemperature, PdStatusState, PdStatusIceMaking {}

export interface GlacierAllQuotaData {
  bms_emsStatus: EmsStatus;
  bms_bmsStatus: BmsStatus;
  pd: PdStatus;
}
