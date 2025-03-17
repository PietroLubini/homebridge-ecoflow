import { Delta2AllQuotaData } from '@ecoflow/accessories/batteries/delta2/interfaces/delta2HttpApiContracts';
import {
  Delta2MqttSetModuleType,
  Delta2MqttSetOperationType,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2MqttApiContracts';
import { SwitchXboostService } from '@ecoflow/accessories/batteries/delta2/services/switchXboostService';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Characteristic, Logging, PlatformAccessory } from 'homebridge';

describe('SwitchXboostService', () => {
  let service: SwitchXboostService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<Delta2AllQuotaData>>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let hapService: HapService;

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
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<Delta2AllQuotaData>>;
    service = new SwitchXboostService(ecoFlowAccessoryMock, Delta2MqttSetModuleType.INV);
    hapService = new HapService('Accessory Switch Name', HapService.Switch.UUID);
  });

  describe('onOnSet', () => {
    let onCharacteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
    });

    it(`should send Set command of MPPT moduleType to device
      when X-Boost value was changed to true and service was initialized with MPPT setAcModuleType`, () => {
      service = new SwitchXboostService(ecoFlowAccessoryMock, Delta2MqttSetModuleType.MPPT);
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);

      onCharacteristic.setValue(true);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: 5,
          operateType: Delta2MqttSetOperationType.AcOutCfg,
          params: {
            out_voltage: 0xffffffff,
            out_freq: 0xff,
            xboost: 1,
            enabled: 0xff,
          },
        },
        expect.any(Function)
      );
    });

    it(`should send Set command of INV moduleType to device
      when X-Boost value was changed to true and service was initialized with INV setAcModuleType`, () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);

      onCharacteristic.setValue(true);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: 3,
          operateType: Delta2MqttSetOperationType.AcOutCfg,
          params: {
            out_voltage: 0xffffffff,
            out_freq: 0xff,
            xboost: 1,
            enabled: 0xff,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command of INV moduleType to device when X-Boost value was changed to false', () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);

      onCharacteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: 3,
          operateType: Delta2MqttSetOperationType.AcOutCfg,
          params: {
            out_voltage: 0xffffffff,
            out_freq: 0xff,
            xboost: 0,
            enabled: 0xff,
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
      expect(logMock.debug.mock.calls).toEqual([['XBoost State ->', true]]);
    });
  });
});
