import { AccessoryConfig, PlatformConfig } from 'homebridge';

export interface EcoFlowConfig extends PlatformConfig {
  devices: DeviceConfig[];
}

export enum DeviceModel {
  Delta2Max = 'Delta 2 Max',
  Delta2 = 'Delta 2',
}

export interface DeviceConfig extends AccessoryConfig {
  model: DeviceModel;
  serialNumber: string;
  accessKey: string;
  secretKey: string;
  battery?: BatteryDeviceConfig;
}

export interface BatteryDeviceConfig {
  customCharacteristics: CustomBatteryCharacteristicType[];
}

export enum CustomBatteryCharacteristicType {
  ConsumptionInWatts = 'Consumption, W',
}
