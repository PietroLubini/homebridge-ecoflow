import { BatteryAllQuotaData } from '@ecoflow/accessories/batteries/interfaces/httpApiBatteryContracts';
import { MqttBatterySetOperationType } from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { OutletAcService } from '@ecoflow/accessories/batteries/services/outletAcService';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { AdditionalBatteryCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

describe('OutletAcService', () => {
  let service: OutletAcService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<BatteryAllQuotaData>>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let batteryStatusProviderMock: jest.Mocked<BatteryStatusProvider>;
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
    batteryStatusProviderMock = { getStatusLowBattery: jest.fn() } as jest.Mocked<BatteryStatusProvider>;
    service = new OutletAcService(ecoFlowAccessoryMock, batteryStatusProviderMock);
    hapService = new HapService('Accessory Outlet Name', HapService.Outlet.UUID);
  });

  describe('updateOutputConsumption', () => {
    it('should set OutputConsumption when it is enabled in configuration', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [CharacteristicType.OutputConsumptionInWatts],
      };
      service = new OutletAcService(ecoFlowAccessoryMock, batteryStatusProviderMock);
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
      service = new OutletAcService(ecoFlowAccessoryMock, batteryStatusProviderMock);
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

  describe('updateStatusLowBattery', () => {
    it('should set low battery level when it is less than 20', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [CharacteristicType.StatusLowBattery],
      };
      service = new OutletAcService(ecoFlowAccessoryMock, batteryStatusProviderMock);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      batteryStatusProviderMock.getStatusLowBattery.mockReturnValue(
        HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_LOW
      );

      service.updateBatteryLevel(19.99, 20);
      const actual = service.service.getCharacteristic(HapCharacteristic.StatusLowBattery).value;

      expect(actual).toEqual(HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
      expect(logMock.debug.mock.calls).toEqual([['AC StatusLowBattery ->', 1]]);
    });

    it('should set normal battery level when it is more than or equal to 20', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [CharacteristicType.StatusLowBattery],
      };
      service = new OutletAcService(ecoFlowAccessoryMock, batteryStatusProviderMock);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      batteryStatusProviderMock.getStatusLowBattery.mockReturnValue(
        HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
      );

      service.updateBatteryLevel(20, 20);
      const actual = service.service.getCharacteristic(HapCharacteristic.StatusLowBattery).value;

      expect(actual).toEqual(HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
      expect(logMock.debug.mock.calls).toEqual([['AC StatusLowBattery ->', 0]]);
    });
  });

  describe('updateBatteryLevel', () => {
    it('should set BatteryLevel when it is enabled in configuration', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [CharacteristicType.BatteryLevel],
      };
      service = new OutletAcService(ecoFlowAccessoryMock, batteryStatusProviderMock);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateBatteryLevel(87.4, 10);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(87);
      expect(logMock.debug.mock.calls).toEqual([['AC Battery Level, % ->', 87.4]]);
    });

    it('should not set BatteryLevel when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateBatteryLevel(87.4, 10);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).not.toHaveBeenCalled();
    });
  });

  describe('onOnSet', () => {
    let onCharacteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      ecoFlowAccessoryMock.quota.inv = {
        inputWatts: 0,
        cfgAcOutVol: 47.9,
        cfgAcOutFreq: 50,
        cfgAcXboost: false,
      };
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
    });

    it('should send Set command to device when On value was changed to true', () => {
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
            xboost: 0,
            enabled: 1,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command to device when On value was changed to false', () => {
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
            xboost: 1,
            enabled: 0,
          },
        },
        expect.any(Function)
      );
    });

    it(`should send Set command to device with cfgAcOutVol set to 220000 when On value was changed and
      there is no cfgAcOutVol value in quota`, () => {
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

    it(`should send Set command to device with cfgAcOutFreq set to 1 when On value was changed and
      there is no cfgAcOutFreq value in quota`, () => {
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

    it('should send Set command to device with XBoost set to true when On value was changed and there is no XBoost value in quota', () => {
      ecoFlowAccessoryMock.quota.inv.cfgAcXboost = undefined;

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
            xboost: 1,
            enabled: 0,
          },
        },
        expect.any(Function)
      );
    });

    it('should revert changing of On state when sending Set command to device is failed', () => {
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
