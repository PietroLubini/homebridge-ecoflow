import { Delta2AccessoryBase } from '@ecoflow/accessories/batteries/delta2/delta2AccessoryBase';
import { Delta2MqttSetModuleType } from '@ecoflow/accessories/batteries/delta2/interfaces/delta2MqttApiContracts';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { DeviceConfig } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Logging, PlatformAccessory } from 'homebridge';

export class Delta2MaxAccessory extends Delta2AccessoryBase {
  constructor(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    log: Logging,
    httpApiManager: EcoFlowHttpApiManager,
    mqttApiManager: EcoFlowMqttApiManager
  ) {
    super(platform, accessory, config, log, httpApiManager, mqttApiManager, {
      setAcModuleType: Delta2MqttSetModuleType.INV,
    });
  }
}
