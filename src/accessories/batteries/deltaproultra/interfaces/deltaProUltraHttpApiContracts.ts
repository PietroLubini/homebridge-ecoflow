export interface PdSetStatus {
  acOutFreq?: AcOutFrequencyType; //Output frequency configured for the inverter (Hz) (read/write)
  // TBD: There is no in specification for all quota
  // acXboost?: AcXBoostType; //X-Boost switch: 0: off; 1: on; 0xff: ignored (read/write)
}

export enum AcOutFrequencyType {
  None = 0,
  '50 Hz' = 50,
  '60 Hz' = 60,
}

export interface PdStatusUsb {
  // dcOutState?: EnableType; //PD DC button status: 0: off; 1: on (read/write)
  outUsb1Pwr?: number; // USB1 output power (W) (read)
  outUsb2Pwr?: number; // USB2 output power (W) (read)
  outTypec1Pwr?: number; // Type-C1 output power (W) (read)
  outTypec2Pwr?: number; // Type-C2 output power (W) (read)
}

export interface PdStatusBackupAc {
  outAcL11Pwr?: number; // Output power of the first AC port (W) (read)
  outAcL12Pwr?: number; // Output power of the second AC output port (W) (read)
}

export interface PdStatusOnlineAc {
  outAcL21Pwr?: number; // Output power of the third AC port (W) (read)
  outAcL22Pwr?: number; // Output power of the fourth AC port (W) (read)
}

export interface PdStatusTt30Ac {
  outAcTtPwr?: number; // TT-30 AC30A output power (W) (read)
}

export interface PdStatusL14Ac {
  outAcL14Pwr?: number; // L14-30 AC30A output power (W) (read)
}

export interface PdStatusInOutAc {
  inAc5p8Pwr?: number; // Input power of the POWER IN/OUT port (W) (read)
  outAc5p8Pwr?: number; // Output power of the POWER IN/OUT port (W) (read)
}

export interface PdStatusAc extends PdStatusBackupAc, PdStatusOnlineAc, PdStatusTt30Ac, PdStatusL14Ac, PdStatusInOutAc {
  // acOutState?: EnableType; //PD DC button status: 0: off; 1: on (read/write)
}

export interface PdStatusSoc {
  soc?: number; //Battery level (read)
}

export interface PdStatusWatts {
  wattsInSum?: number; //Total input power (W) (read)
  wattsOutSum?: number; //Total output power (W) (read)
}

export interface PdStatus extends PdStatusSoc, PdStatusWatts, PdStatusAc, PdStatusUsb {}

export interface DeltaProUltraAllQuotaData {
  hs_yj751_pd_appshow_addr: PdStatus;
  hs_yj751_pd_app_set_info_addr: PdSetStatus;
}
