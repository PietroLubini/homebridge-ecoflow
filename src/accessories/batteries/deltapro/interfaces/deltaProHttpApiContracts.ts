import {
  AcEnableType,
  AcOutFrequencyType,
  AcXBoostType,
} from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';

// Battery management system status
// export interface BmsMasterStatus {
//   f32ShowSoc?: number; //Battery level (read)
// }
export interface EmsStatus {
  f32LcdShowSoc?: number; //Battery level (read)
  minDsgSoc?: number; //Discharge limit
}

// AC invertor status
export interface InvStatusAc {
  outputWatts?: number; //Discharging power (W) (read)
  cfgAcEnabled?: AcEnableType; //AC switch: 0: off; 1: on (read/write)
  cfgAcXboost?: AcXBoostType; //X-Boost switch: 0: off; 1: on; 0xff: ignored (read/write)
  cfgAcOutFreq?: AcOutFrequencyType; //Output frequency configured for the inverter (Hz) (read/write)
  cfgAcOutVoltage?: number; //Output voltage configured for the inverter (V): 0xffffffff: ignored (read/write)
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

export interface DeltaProAllQuotaData {
  ems: EmsStatus;
  inv: InvStatus;
  pd: PdStatus;
}
