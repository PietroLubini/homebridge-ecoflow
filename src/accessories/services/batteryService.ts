import { PlatformAccessory, Service } from 'homebridge';
import { ServiceBase } from './serviceBase.js';
import { DeviceConfig } from '../../config.js';
import { EcoFlowHomebridgePlatform } from 'platform.js';
import {
  BmsStatusMqttMessageParams,
  InvStatusMqttMessageParams,
} from 'accessories/apis/interfaces/ecoFlowMqttContacts.js';
import { EcoFlowMqttApi } from 'accessories/apis/ecoFlowMqttApi.js';
import { Subscription } from 'rxjs';

export class BatteryService extends ServiceBase {
  private readonly batteryService: Service;

  constructor(
    accessory: PlatformAccessory,
    platform: EcoFlowHomebridgePlatform,
    config: DeviceConfig,
    api: EcoFlowMqttApi
  ) {
    super(accessory, platform, config, api);

    this.batteryService =
      this.accessory.getService(this.platform.Service.Battery) ||
      this.accessory.addService(this.platform.Service.Battery);
  }

  protected override subscribe(api: EcoFlowMqttApi): Subscription[] {
    const result = [];
    result.push(api.bmsParams$.subscribe(params => this.updateBmsParams(params)));
    result.push(api.invParams$.subscribe(params => this.updateInvParams(params)));
    return result;
  }

  private updateBmsParams(params: BmsStatusMqttMessageParams): void {
    if (params.f32ShowSoc) {
      this.updateStatusLowBattery(params.f32ShowSoc);
      this.updateBatteryLevel(params.f32ShowSoc);
    }
  }

  private updateInvParams(params: InvStatusMqttMessageParams): void {
    if (params.inputWatts) {
      this.updateChargingState(params.inputWatts);
    }
  }

  private updateStatusLowBattery(batteryLevel: number): void {
    const statusLowBattery = batteryLevel < 20;
    this.log.debug('Status Low Battery ->', statusLowBattery);
    this.batteryService
      .getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .updateValue(
        statusLowBattery
          ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
          : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
      );
  }

  private updateBatteryLevel(batteryLevel: number): void {
    this.log.debug('BatteryLevel ->', batteryLevel);
    this.batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel).updateValue(batteryLevel);
  }

  private updateChargingState(chargingPower: number): void {
    const isCharging = chargingPower > 0;
    this.log.debug('ChargingState ->', isCharging);
    this.batteryService.getCharacteristic(this.platform.Characteristic.ChargingState).updateValue(isCharging);
  }
}
