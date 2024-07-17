import { AccessoryConfig, PlatformConfig } from 'homebridge';

export interface EcoFlowConfig extends PlatformConfig {
  devices: DeviceConfig[];
}

export enum DeviceModel {
  Delta2Max = 'Delta 2 Max'
}

export interface DeviceConfig extends AccessoryConfig {
  model: DeviceModel;
  serialNumber: string;
  accessKey: string;
  secretKey: string;
}
