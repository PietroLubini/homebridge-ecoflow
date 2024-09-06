// Battery management system status
export interface BmsStatus {
  f32ShowSoc?: number; //Battery level (read)
}

export enum EnableType {
  Off = 0,
  On = 1,
}

export enum AcEnableType {
  Off = 0,
  On = 1,
  Ignore = 0xff,
}

export enum AcXBoostType {
  Off = 0,
  On = 1,
  Ignore = 0xff,
}

export enum AcOutFrequencyType {
  '50 Hz' = 1,
  '60 Hz' = 2,
  Ignore = 0xff,
}

export const AcOutVoltageIgnore = 0xffffffff;

export interface StatusAc {
  cfgAcEnabled?: AcEnableType; //AC switch: 0: off; 1: on; 0xff: ignored (read/write)
  cfgAcXboost?: AcXBoostType; //X-Boost switch: 0: off; 1: on; 0xff: ignored (read/write)
  cfgAcOutFreq?: AcOutFrequencyType; //Output frequency configured for the inverter (Hz) (read/write)
  cfgAcOutVol?: number; //Output voltage configured for the inverter (V): 0xffffffff: ignored (read/write)
}

// AC invertor status
export interface InvStatusAc extends StatusAc {
  outputWatts?: number; //Discharging power (W) (read)
}

// Invertor status
export interface InvStatus extends InvStatusAc {
  inputWatts?: number; //Charging power (W) (read)
}

export interface PdStatusCar {
  carState?: EnableType; //PD CAR button status: 0: off; 1: on (read/write)
  carWatts?: number; //CAR output power (W) (read)
}

export interface PdStatusUsb {
  dcOutState?: EnableType; //PD DC button status: 0: off; 1: on (read/write)
  usb1Watts?: number; //Common USB1 output power (W) (read)
  usb2Watts?: number; //Common USB2 output power for PD (W) (read)
  qcUsb1Watts?: number; //qc_usb1 output power (W) (read)
  qcUsb2Watts?: number; //qc_usb2 output power (W) (read)
  typec1Watts?: number; //Type-C 1 output power (W) (read)
  typec2Watts?: number; //Type-C 2 output power (W) (read)
}

export interface PdStatus extends PdStatusUsb, PdStatusCar {}

export interface Delta2AllQuotaData {
  bms_bmsStatus: BmsStatus;
  inv: InvStatus;
  pd: PdStatus;
  mppt: MpptStatus;
}

// Applicable for Delta 2 only
export interface MpptStatus extends StatusAc {}
// Applicable for Delta 2 only
