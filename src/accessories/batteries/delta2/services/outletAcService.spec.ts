import { Delta2AllQuotaData } from '@ecoflow/accessories/batteries/delta2/interfaces/delta2HttpApiContracts';
import {
  Delta2MqttSetModuleType,
  Delta2MqttSetOperationType,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2MqttApiContracts';
import { OutletAcService } from '@ecoflow/accessories/batteries/delta2/services/outletAcService';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { AdditionalBatteryCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

describe('OutletAcService', () => {
  let service: OutletAcService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<Delta2AllQuotaData>>;
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
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<Delta2AllQuotaData>>;
    service = new OutletAcService(ecoFlowAccessoryMock, Delta2MqttSetModuleType.INV);
    hapService = new HapService('Accessory Outlet Name', HapService.Outlet.UUID);
  });

  describe('updateOutputConsumption', () => {
    it('should set OutputConsumption when it is enabled in configuration', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [CharacteristicType.OutputConsumptionInWatts],
      };
      service = new OutletAcService(ecoFlowAccessoryMock, Delta2MqttSetModuleType.MPPT);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputConsumption(34.6);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.OutputConsumptionWatts
      ).value;

      expect(actual).toEqual(35);
      expect(logMock.debug.mock.calls).toEqual([
        ['AC InUse ->', true],
        ['AC Output Consumption, W ->', 34.6],
      ]);
    });

    it('should not set OutputConsumption when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputConsumption(34.6);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.OutputConsumptionWatts
      ).value;

      expect(actual).toEqual(0);
      expect(logMock.debug.mock.calls).toEqual([['AC InUse ->', true]]);
    });
  });

  describe('updateInputConsumption', () => {
    it('should set InputConsumption when it is enabled in configuration', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [CharacteristicType.InputConsumptionInWatts],
      };
      service = new OutletAcService(ecoFlowAccessoryMock, Delta2MqttSetModuleType.MPPT);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateInputConsumption(41.1);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.InputConsumptionWatts
      ).value;

      expect(actual).toEqual(41);
      expect(logMock.debug.mock.calls).toEqual([['AC Input Consumption, W ->', 41.1]]);
    });

    it('should not set InputConsumption when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateInputConsumption(41.1);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.InputConsumptionWatts
      ).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).not.toHaveBeenCalled();
    });
  });

  describe('updateBatteryLevel', () => {
    it('should set BatteryLevel when it is enabled in configuration', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [CharacteristicType.BatteryLevel],
      };
      service = new OutletAcService(ecoFlowAccessoryMock, Delta2MqttSetModuleType.MPPT);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateBatteryLevel(87.4);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(87);
      expect(logMock.debug.mock.calls).toEqual([['AC Battery Level, % ->', 87.4]]);
    });

    it('should not set BatteryLevel when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateBatteryLevel(87.4);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).not.toHaveBeenCalled();
    });
  });

  describe('onOnSet', () => {
    let onCharacteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
    });

    it(`should send Set command of MPPT moduleType to device
      when Enabled value was changed to true and service was initialized with MPPT setAcModuleType`, () => {
      service = new OutletAcService(ecoFlowAccessoryMock, Delta2MqttSetModuleType.MPPT);
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
            xboost: 0xff,
            enabled: 1,
          },
        },
        expect.any(Function)
      );
    });

    it(`should send Set command of INV moduleType to device
      when Enabled value was changed to true and service was initialized with INV setAcModuleType`, () => {
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
            xboost: 0xff,
            enabled: 1,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command of INV moduleType to device when Enabled value was changed to false', () => {
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
            xboost: 0xff,
            enabled: 0,
          },
        },
        expect.any(Function)
      );
    });

    it('should revert changing of Enabled state when sending Set command to device is failed', () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
      onCharacteristic.updateValue(true);

      onCharacteristic.setValue(false);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = onCharacteristic.value;

      expect(actual).toBeTruthy();
      expect(logMock.debug.mock.calls).toEqual([['AC State ->', true]]);
    });
  });
});
