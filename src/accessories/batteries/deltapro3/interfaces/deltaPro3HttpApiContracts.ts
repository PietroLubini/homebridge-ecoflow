import { AcXBoostType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';

export enum DeltaPro3AcEnableType {
  Off = 0,
  On = 2,
  Ignore = 0xff,
}

export interface DeltaPro3AllQuotaData {
  cmsBattSoc?: number; //Battery level (read)
  cmsMinDsgSoc?: number; //Discharge limit (read)
  xboostEn?: AcXBoostType; //X-Boost switch: 0: off; 1: on; 0xff: ignored (read/write -> cfgXboostEn)
  // powInSumW?: number; //Total input power (W). (read)
  // powOutSumW?: number; //Total output power (W) (read)
  inputWatts?: number; //Charging power (W) (read)
  outputWatts?: number; //Discharging power (W) (read)

  // AC - US
  flowInfoAcLvOut?: DeltaPro3AcEnableType; // AC low-voltage output switch status: 0: off; 2: on; 0xff: ignored (read/write -> cfgLvAcOutOpen)
  powGetAcLvOut?: number; // Real-time low-voltage AC output power (-N W) (read)
  flowInfoAcHvOut?: DeltaPro3AcEnableType; // AC high-voltage output switch statuss: 0: off; 2: on; 0xff: ignored (read/write -> cfgHvAcOutOpen)
  powGetAcHvOut?: number; // Real-time high-voltage AC output power (-N W) (read)

  // AC - EU
  powGetAc?: number; // Real-time AC power (-N W) (read)

  // 12V
  flowInfo12v?: DeltaPro3AcEnableType; // 12V output switch status: 0: off; 2: on; 0xff: ignored (read/write -> cfgDc12vOutOpen)
  powGet12v?: number; // Real-time 12V power (-N W).

  // USB
  powGetTypec1?: number; // Real-time power of Type-C port 1 (-N W) (read)
  powGetTypec2?: number; // Real-time power of Type-C port 2 (-N W) (read)
  powGetQcusb1?: number; // Real-time power of the USB 1 port (-N W) (read)
  powGetQcusb2?: number; // Real-time power of the USB 2 port (-N W) (read)
}
