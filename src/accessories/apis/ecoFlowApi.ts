import { EcoFlowApiBase } from './ecoFlowApiBase.js';

export class EcoFlowApi extends EcoFlowApiBase {
  private batteryLevel: Promise<number> | null = null;

  async isLowBattery(): Promise<boolean> {
    const batteryLevel = await this.getBatteryLevel();
    return batteryLevel < 20;
  }

  getBatteryLevel(): Promise<number> {
    if (!this.batteryLevel) {
      this.batteryLevel = this.executeGet<number>('bms_bmsStatus.f32ShowSoc')
        .finally(() => {
          this.batteryLevel = null;
        });
    }
    return this.batteryLevel;
  }

  async isBatteryCharging(): Promise<boolean> {
    const chargingPower = await this.executeGet<number>('inv.inputWatts');
    return chargingPower > 0;
  }

  async getAcState(): Promise<boolean> {
    const value = await this.executeGet<number>('inv.cfgAcEnabled');
    return value === 1;
  }

  async getDcState(): Promise<boolean> {
    const value = await this.executeGet<number>('pd.carState');
    return value === 1;
  }

  async getUsbState(): Promise<boolean> {
    const value = await this.executeGet<number>('pd.dcOutState');
    return value === 1;
  }

  // setUsbState(value: boolean): Promise<void> {
  //   return this.executeSet<number>('pd.dcOutState');
  // }

  // getPowerCharging(): Promise<number> {
  //   return this.executeGet<number>('inv.inputWatts');
  // }

  // getPowerConsumption(): Promise<number> {
  //   return this.executeGet<number>('inv.outputWatts');
  // }
}