import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import {
  AdditionalBatteryOutletCharacteristicType as BatteryOutletCharacteristicType,
  AdditionalOutletCharacteristicType as OutletCharacteristicType,
} from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { OutletReadOnlyService } from '@ecoflow/services/outletReadOnlyService';
import { Characteristic as HapCharacteristic, Service as HapService, Perms } from 'hap-nodejs';
import { API, Characteristic, Logging, PlatformAccessory } from 'homebridge';

describe('OutletReadOnlyService', () => {
  let service: OutletReadOnlyService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryBase>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let batteryStatusProviderMock: jest.Mocked<BatteryStatusProvider>;
  let hapService: HapService;

  const apiMock = {
    hap: {
      Characteristic: HapCharacteristic,
    },
  } as unknown as API;
  EcoFlowHomebridgePlatform.InitCharacteristics(apiMock);

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
      api: apiMock,
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
    } as unknown as jest.Mocked<EcoFlowAccessoryBase>;
    batteryStatusProviderMock = { getStatusLowBattery: jest.fn() } as jest.Mocked<BatteryStatusProvider>;
    service = new OutletReadOnlyService(ecoFlowAccessoryMock, batteryStatusProviderMock, 'PV');
    hapService = new HapService('Accessory Outlet Name', HapService.Outlet.UUID);
  });

  describe('updateOutputConsumption', () => {
    it('should set OutputConsumption when it is enabled in configuration', () => {
      service = new OutletReadOnlyService(ecoFlowAccessoryMock, batteryStatusProviderMock, 'INV', [
        OutletCharacteristicType.OutputConsumptionInWatts,
      ]);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputConsumption(34.6);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.OutputConsumptionWatts).value;

      expect(actual).toEqual(35);
      expect(logMock.debug.mock.calls).toEqual([
        ['INV InUse ->', true],
        ['INV Output Consumption, W ->', 34.6],
      ]);
    });

    it('should not set OutputConsumption when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletReadOnlyService(ecoFlowAccessoryMock, batteryStatusProviderMock, 'INV');
      service.initialize();

      service.updateOutputConsumption(34.6);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.OutputConsumptionWatts).value;

      expect(actual).toEqual(0);
      expect(logMock.debug.mock.calls).toEqual([['INV InUse ->', true]]);
    });
  });

  describe('updateInputConsumption', () => {
    it('should set InputConsumption when it is enabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletReadOnlyService(ecoFlowAccessoryMock, batteryStatusProviderMock, 'BAT', [
        BatteryOutletCharacteristicType.InputConsumptionInWatts,
      ]);
      service.initialize();

      service.updateInputConsumption(41.1);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.InputConsumptionWatts).value;

      expect(actual).toEqual(41);
      expect(logMock.debug.mock.calls).toEqual([['BAT Input Consumption, W ->', 41.1]]);
    });

    it('should not set InputConsumption when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletReadOnlyService(ecoFlowAccessoryMock, batteryStatusProviderMock, 'BAT');
      service.initialize();

      service.updateInputConsumption(41.1);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.InputConsumptionWatts).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).not.toHaveBeenCalled();
    });
  });

  describe('updateStatusLowBattery', () => {
    it('should set low battery level when it is less than 20', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletReadOnlyService(ecoFlowAccessoryMock, batteryStatusProviderMock, 'BAT', [BatteryOutletCharacteristicType.StatusLowBattery]);
      service.initialize();
      batteryStatusProviderMock.getStatusLowBattery.mockReturnValue(HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_LOW);

      service.updateBatteryLevel(19.99, 20);
      const actual = service.service.getCharacteristic(HapCharacteristic.StatusLowBattery).value;

      expect(actual).toEqual(HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
      expect(logMock.debug).toHaveBeenCalledWith('BAT StatusLowBattery ->', 1);
    });

    it('should set normal battery level when it is more than or equal to 20', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletReadOnlyService(ecoFlowAccessoryMock, batteryStatusProviderMock, 'BAT', [BatteryOutletCharacteristicType.StatusLowBattery]);
      service.initialize();
      batteryStatusProviderMock.getStatusLowBattery.mockReturnValue(HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);

      service.updateBatteryLevel(20, 20);
      const actual = service.service.getCharacteristic(HapCharacteristic.StatusLowBattery).value;

      expect(actual).toEqual(HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
      expect(logMock.debug).toHaveBeenCalledWith('BAT StatusLowBattery ->', 0);
    });

    it('should not set StatusLowBattery when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateBatteryLevel(87.4, 10);

      const actual = service.service.getCharacteristic(HapCharacteristic.StatusLowBattery).value;

      expect(actual).toEqual(0);
      expect(batteryStatusProviderMock.getStatusLowBattery).not.toHaveBeenCalled();
      expect(logMock.debug).not.toHaveBeenCalled();
    });
  });

  describe('updateBatteryLevel', () => {
    it('should set BatteryLevel when it is enabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletReadOnlyService(ecoFlowAccessoryMock, batteryStatusProviderMock, 'BAT', [BatteryOutletCharacteristicType.BatteryLevel]);
      service.initialize();

      service.updateBatteryLevel(87.4, 10);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(87);
      expect(logMock.debug.mock.calls).toEqual([['BAT Battery Level, % ->', 87.4]]);
    });

    it('should not set BatteryLevel when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletReadOnlyService(ecoFlowAccessoryMock, batteryStatusProviderMock, 'BAT');
      service.initialize();

      service.updateBatteryLevel(87.4, 10);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).not.toHaveBeenCalled();
    });
  });

  describe('processOnSetOn', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.On);
    });

    it('should not allow to set ON value', () => {
      expect(characteristic.props.perms).not.toContain(Perms.PAIRED_WRITE);
    });
  });
});
