import { AccessoryConfig, PlatformConfig } from 'homebridge';

export interface EcoFlowConfig extends PlatformConfig {
  devices: DeviceConfig[];
}

export enum DeviceModel {
  Delta2Max = 'Delta 2 Max',
  Delta2 = 'Delta 2',
  PowerStream = 'PowerStream',
}

export enum LocationType {
  EU = 'EU',
  US = 'US',
}

export type SerialNumber = string;

export interface DeviceInfoConfig {
  name: string;
  serialNumber: SerialNumber;
}

export interface DeviceAccessConfig extends DeviceInfoConfig {
  location: LocationType;
  accessKey: string;
  secretKey: string;
  reconnectMqttTimeoutMs?: number;
}

export interface DeviceConfig extends AccessoryConfig, DeviceAccessConfig {
  model: DeviceModel;
  battery?: BatteryDeviceConfig;
  powerStream?: PowerStreamDeviceConfig;
}

export interface BatteryDeviceConfig {
  additionalCharacteristics: AdditionalBatteryCharacteristicType[];
}

export enum AdditionalBatteryCharacteristicType {
  BatteryLevel = 'Battery Level, %',
  InputConsumptionInWatts = 'Input Consumption, W',
  OutputConsumptionInWatts = 'Output Consumption, W',
}

export interface PowerStreamDeviceConfig {
  battery?: BatteryDeviceConfig;
  solar?: BatteryDeviceConfig;
  inverter?: BatteryDeviceConfig;
}
