// Battery management system status
export interface BmsStatus {
  f32ShowSoc?: number; //Battery level
}

// AC invertor status
export interface InvStatusAc {
  outputWatts?: number; //Discharging power (W)
  cfgAcEnabled?: boolean; //AC switch: 0: off; 1: on
  cfgAcXboost?: boolean; //X-Boost switch: 0: off; 1: on
  cfgAcOutFreq?: number; //Output frequency configured for the inverter (Hz)
  cfgAcOutVol?: number; //Output voltage configured for the inverter (V)
}

// Invertor status
export interface InvStatus extends InvStatusAc {
  inputWatts?: number; //Charging power (W)
}

export interface PdStatusCar {
  carState?: boolean; //PD CAR button status: 0: off; 1: on
  carWatts?: number; //CAR output power (W)
}

export interface PdStatusUsb {
  dcOutState?: boolean; //PD DC button status: 0: off; 1: on
  usb1Watts?: number; //Common USB1 output power (W)
  usb2Watts?: number; //Common USB2 output power for PD (W)
  qcUsb1Watts?: number; //qc_usb1 output power (W)
  qcUsb2Watts?: number; //qc_usb2 output power (W)
  typec1Watts?: number; //Type-C 1 output power (W)
  typec2Watts?: number; //Type-C 2 output power (W)
}

export interface PdStatus extends PdStatusUsb, PdStatusCar {}

export interface BatteryAllQuotaData {
  bms_bmsStatus: BmsStatus;
  inv: InvStatus;
  pd: PdStatus;
}
