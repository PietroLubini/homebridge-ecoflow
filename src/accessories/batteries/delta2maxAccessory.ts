import { BatteryAccessoryBase } from '@ecoflow/accessories/batteries/batteryAccessoryBase';
import { MqttBatterySetModuleType } from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { DeviceConfig } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Logging, PlatformAccessory } from 'homebridge';

export class Delta2MaxAccessory extends BatteryAccessoryBase {
  constructor(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    log: Logging,
    httpApiManager: EcoFlowHttpApiManager,
    mqttApiManager: EcoFlowMqttApiManager
  ) {
    super(platform, accessory, config, log, httpApiManager, mqttApiManager, {
      setAcModuleType: MqttBatterySetModuleType.INV,
    });
  }
}
