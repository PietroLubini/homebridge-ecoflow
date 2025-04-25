export interface PowerOceanAllQuotaData {
  // Solar
  evPwr?: number; //Power of the EV charger (read)

  // Battery
  bpPwr?: number; //Battery power; positive for discharging and negative for charging? (read)
  bpSoc?: number; //Battery level (read)

  // Invertor
  sysLoadPwr?: number; // Load power (read)
  sysGridPwr?: number; // Grid power (read)
}
