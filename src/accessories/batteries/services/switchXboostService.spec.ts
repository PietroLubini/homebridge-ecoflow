import { BatteryAllQuotaData } from '@ecoflow/accessories/batteries/interfaces/httpApiBatteryContracts';
import {
  MqttBatterySetModuleType,
  MqttBatterySetOperationType,
} from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { SwitchXboostService } from '@ecoflow/accessories/batteries/services/switchXboostService';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

describe('SwitchXboostService', () => {
  let service: SwitchXboostService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<BatteryAllQuotaData>>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let hapService: HapService;

  const hapMock = {
    Characteristic: HapCharacteristic,
  } as unknown as HAP;
  EcoFlowHomebridgePlatform.InitCustomCharacteristics(hapMock);

  beforeEach(() => {
    logMock = {
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logging>;
    platformMock = {
      Service: HapService,
      Characteristic: {
        ...HapCharacteristic,
        ...CustomCharacteristics,
      } as unknown as typeof HapCharacteristic & typeof CustomCharacteristics,
    } as unknown as jest.Mocked<EcoFlowHomebridgePlatform>;
    accessoryMock = {
      getServiceById: jest.fn(),
      addService: jest.fn(),
    } as unknown as jest.Mocked<PlatformAccessory>;
    httpApiManagerMock = { getAllQuotas: jest.fn() } as unknown as jest.Mocked<EcoFlowHttpApiManager>;
    ecoFlowAccessoryMock = {
      log: logMock,
      platform: platformMock,
      accessory: accessoryMock,
      config: {
        name: 'accessory1',
      },
      httpApiManager: httpApiManagerMock,
      quota: {},
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<BatteryAllQuotaData>>;
    service = new SwitchXboostService(ecoFlowAccessoryMock, MqttBatterySetModuleType.INV);
    hapService = new HapService('Accessory Switch Name', HapService.Switch.UUID);
  });

  describe('onOnSet', () => {
    let onCharacteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      ecoFlowAccessoryMock.quota.inv = {
        inputWatts: 0,
        cfgAcOutVol: 47.9,
        cfgAcOutFreq: 50,
        cfgAcEnabled: false,
      };
    });

    it(`should send Set command of MPPT moduleType to device
      when X-Boost value was changed to true and service was initialized with MPPT setAcModuleType`, () => {
      service = new SwitchXboostService(ecoFlowAccessoryMock, MqttBatterySetModuleType.MPPT);
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);

      onCharacteristic.setValue(true);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: 5,
          operateType: MqttBatterySetOperationType.AcOutCfg,
          params: {
            out_voltage: 47.9,
            out_freq: 50,
            xboost: 1,
            enabled: 0,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command of INV moduleType to device when X-Boost value was changed to true', () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);

      onCharacteristic.setValue(true);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: 3,
          operateType: MqttBatterySetOperationType.AcOutCfg,
          params: {
            out_voltage: 47.9,
            out_freq: 50,
            xboost: 1,
            enabled: 0,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command of INV moduleType to device when X-Boost value was changed to false', () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
      ecoFlowAccessoryMock.quota.inv.cfgAcXboost = true;

      onCharacteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: 3,
          operateType: MqttBatterySetOperationType.AcOutCfg,
          params: {
            out_voltage: 47.9,
            out_freq: 50,
            xboost: 0,
            enabled: 0,
          },
        },
        expect.any(Function)
      );
    });

    it(`should send Set command of INV moduleType to device with cfgAcOutVol set to 220000 when X-Boost value was changed and
      there is no cfgAcOutVol value in quota`, () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
      ecoFlowAccessoryMock.quota.inv.cfgAcOutVol = undefined;

      onCharacteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: 3,
          operateType: MqttBatterySetOperationType.AcOutCfg,
          params: {
            out_voltage: 220000,
            out_freq: 50,
            xboost: 0,
            enabled: 0,
          },
        },
        expect.any(Function)
      );
    });

    it(`should send Set command of INV moduleType to device with cfgAcOutFreq set to 1 when X-Boost value was changed and
      there is no cfgAcOutFreq value in quota`, () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
      ecoFlowAccessoryMock.quota.inv.cfgAcOutFreq = undefined;

      onCharacteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: 3,
          operateType: MqttBatterySetOperationType.AcOutCfg,
          params: {
            out_voltage: 47.9,
            out_freq: 1,
            xboost: 0,
            enabled: 0,
          },
        },
        expect.any(Function)
      );
    });

    it(`should send Set command of INV moduleType to device with Enabled set to false
      when X-Boost value was changed and there is no Enabled value in quota`, () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
      ecoFlowAccessoryMock.quota.inv.cfgAcEnabled = undefined;

      onCharacteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: 3,
          operateType: MqttBatterySetOperationType.AcOutCfg,
          params: {
            out_voltage: 47.9,
            out_freq: 50,
            xboost: 0,
            enabled: 0,
          },
        },
        expect.any(Function)
      );
    });

    it('should revert changing of X-Boost state when sending Set command to device is failed', () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
      onCharacteristic.updateValue(true);

      onCharacteristic.setValue(false);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = onCharacteristic.value;

      expect(actual).toBeTruthy();
      expect(logMock.debug.mock.calls).toEqual([['X-Boost State ->', true]]);
    });
  });
});
