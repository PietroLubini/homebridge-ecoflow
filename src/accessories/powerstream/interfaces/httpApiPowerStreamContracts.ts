export interface Heartbeat {
  // Solar input
  pv1InputWatts?: number; //PV1 input power: 0.1 W - solar panel input1 (read)
  pv2InputWatts?: number; //PV2 input power: 0.1 W - solar panel input2 (read)

  // Battery input
  batInputWatts?: number; //BAT input power: 0.1 W; positive for discharging and negative for charging (read)
  batSoc?: number; //Battery level (read)

  // Invertor output (Solar + Battery)
  invOutputWatts?: number; //INV input power: 0.1 W; positive for discharging and negative for charging (read)
  invOnOff?: boolean; //Micro-inverter switch: 0: off; 1: on (read)
  invBrightness?: number; //Micro-inverter LED brightness adjustment, 0-1023 (read/write)

  // Settings
  supplyPriority?: number; //Power supply priority: 0: prioritize power supply; 1: prioritize power storage (read/write)
  permanentWatts?: number; //0.1 W; Custom load power (power of loads not connected to smart plugs),  0–600W (read/write)
  upperLimit?: number; //Upper Charge limit, 1-30% (read/write)
  lowerLimit?: number; //Discharge limit, 70-100% (read/write)
}

export interface PowerStreamAllQuotaData {
  '20_1': Heartbeat;
}
