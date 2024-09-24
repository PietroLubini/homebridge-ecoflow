import { Simulator } from '@ecoflow/apis/simulations/simulator';
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
  model: DeviceModel;
  reconnectMqttTimeoutMs?: number;
  simulate?: boolean;
  simulator?: new () => Simulator;
  simulateQuotaTimeoutMs?: number;
}

export interface DeviceConfig extends AccessoryConfig, DeviceAccessConfig {
  disabled: boolean;
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

export enum PowerStreamConsumptionType {
  W600 = 600,
  W800 = 800,
}

export interface PowerStreamDeviceConfig {
  type: PowerStreamConsumptionType;
  batteryAdditionalCharacteristics?: AdditionalBatteryCharacteristicType[];
  pvAdditionalCharacteristics?: AdditionalBatteryCharacteristicType[];
  inverterAdditionalCharacteristics?: AdditionalBatteryCharacteristicType[];
}
