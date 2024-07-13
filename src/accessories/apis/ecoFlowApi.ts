import { Logging } from 'homebridge';
import { DeviceConfig } from '../../config.js';

export class EcoFlowApi {
  constructor(private config: DeviceConfig, private log: Logging) {
  }

  async isLowBattery(): Promise<boolean> {
    return true;
  }

  async getBatteryLevel(): Promise<number> {
    return 56.73;
  }

  async isBatteryCharging(): Promise<boolean> {
    return false;
  }
}