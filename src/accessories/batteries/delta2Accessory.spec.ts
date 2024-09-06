import { Delta2Accessory } from '@ecoflow/accessories/batteries/delta2Accessory';
import { MqttBatterySetModuleType } from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { OutletAcService } from '@ecoflow/accessories/batteries/services/outletAcService';
import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { DeviceConfig } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Logging, PlatformAccessory } from 'homebridge';

jest.mock('@ecoflow/services/batteryStatusService');
jest.mock('@ecoflow/accessories/batteries/services/outletUsbService');
jest.mock('@ecoflow/accessories/batteries/services/outletAcService');
jest.mock('@ecoflow/accessories/batteries/services/outletCarService');
jest.mock('@ecoflow/accessories/batteries/services/switchXboostService');
jest.mock('@ecoflow/services/accessoryInformationService');

describe('Delta2Accessory', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
  let config: DeviceConfig;

  beforeEach(() => {
    platformMock = {} as jest.Mocked<EcoFlowHomebridgePlatform>;
    accessoryMock = {} as jest.Mocked<PlatformAccessory>;
    config = {} as DeviceConfig;
    logMock = {} as jest.Mocked<Logging>;
    httpApiManagerMock = {} as jest.Mocked<EcoFlowHttpApiManager>;
    mqttApiManagerMock = {} as jest.Mocked<EcoFlowMqttApiManager>;
  });

  describe('initialize', () => {
    it('should use Delta2-specific configuration when initializing accessory', () => {
      let actual: MqttBatterySetModuleType | undefined;
      (OutletAcService as jest.Mock).mockImplementation(
        (_accessory: EcoFlowAccessoryBase, setAcModuleType: MqttBatterySetModuleType) => {
          actual = setAcModuleType;
          return undefined;
        }
      );

      new Delta2Accessory(platformMock, accessoryMock, config, logMock, httpApiManagerMock, mqttApiManagerMock);

      expect(actual).toBe(MqttBatterySetModuleType.MPPT);
    });
  });
});
