// Battery management system status
export interface EmsStatus {
  f32LcdShowSoc?: number; //Battery level
}

// AC invertor status
export interface InvStatusAc {
  outputWatts?: number; //Discharging power (W) (read)
  cfgAcEnabled?: boolean; //AC switch: 0: off; 1: on (read/write)
  cfgAcXboost?: boolean; //X-Boost switch: 0: off; 1: on (read/write)
  cfgAcOutFreq?: number; //Output frequency configured for the inverter (Hz) (read/write)
  cfgAcOutVol?: number; //Output voltage configured for the inverter (V) (read/write)
}

// Invertor status
export interface InvStatus extends InvStatusAc {
  inputWatts?: number; //Charging power (W) (read)
}

export interface PdStatusCar {
  carState?: boolean; //PD CAR button status: 0: off; 1: on (read/write)
  carWatts?: number; //CAR output power (W) (read)
}

export interface PdStatusUsb {
  dcOutState?: boolean; //PD DC button status: 0: off; 1: on (read/write)
  usb1Watts?: number; //Common USB1 output power (W) (read)
  usb2Watts?: number; //Common USB2 output power for PD (W) (read)
  qcUsb1Watts?: number; //qc_usb1 output power (W) (read)
  qcUsb2Watts?: number; //qc_usb2 output power (W) (read)
  typec1Watts?: number; //Type-C 1 output power (W) (read)
  typec2Watts?: number; //Type-C 2 output power (W) (read)
}

export interface PdStatus extends PdStatusUsb, PdStatusCar {}

export interface BatteryAllQuotaData {
  bms_emsStatus: EmsStatus;
  inv: InvStatus;
  pd: PdStatus;
}
