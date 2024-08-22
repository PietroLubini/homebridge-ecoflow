export interface Heartbeat {
  // Solar input
  pv1InputWatts?: number; //PV1 input power: 0.1 W - solar panel input1
  pv2InputWatts?: number; //PV2 input power: 0.1 W - solar panel input2

  // Battery input
  batInputWatts?: number; //BAT input power: 0.1 W; positive for discharging and negative for charging
  batSoc?: number; //Battery level

  // Invertor output (Solar + Battery)
  invOutputWatts?: number; //INV input power: 0.1 W; positive for discharging and negative for charging
  invOnOff?: boolean; //Micro-inverter switch: 0: off; 1: on (readonly)

  // Settings
  supplyPriority?: number; //Power supply priority: 0: prioritize power supply; 1: prioritize power storage
  permanentWatts?: number; //Custom load power (power of loads not connected to smart plugs),  0–600W
  upperLimit?: number; //Upper Charge limit, 1-30%
  lowerLimit?: number; //Discharge limit, 70-100%
  invBrightness?: number; //Micro-inverter LED brightness adjustment, 0-1023
}

export interface PowerStreamAllQuotaData {
  '20_1': Heartbeat;
}
