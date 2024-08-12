import { AccessoryConfig, PlatformConfig } from 'homebridge';

export interface EcoFlowConfig extends PlatformConfig {
  devices: DeviceConfig[];
}

export enum DeviceModel {
  Delta2Max = 'Delta 2 Max',
  Delta2 = 'Delta 2',
}

export enum LocationType {
  EU = 'EU',
  US = 'US',
}

export interface DeviceConfig extends AccessoryConfig {
  model: DeviceModel;
  serialNumber: string;
  location: LocationType;
  accessKey: string;
  secretKey: string;
  battery?: BatteryDeviceConfig;
  reconnectMqttTimeoutInMs?: number;
}

export interface BatteryDeviceConfig {
  additionalCharacteristics: AdditionalBatteryCharacteristicType[];
}

export enum AdditionalBatteryCharacteristicType {
  BatteryLevel = 'Battery Level, %',
  InputConsumptionInWatts = 'Input Consumption, W',
  OutputConsumptionInWatts = 'Output Consumption, W',
}
