import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { GlacierAllQuotaData } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import { OutletBatteryService } from '@ecoflow/accessories/glacier/services/outletBatteryService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import {
  AdditionalBatteryOutletCharacteristicType as BatteryOutletCharacteristicType,
  AdditionalOutletCharacteristicType as OutletCharacteristicType,
} from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService, HAPStatus, HapStatusError } from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

enum HAPStatusMock {
  READ_ONLY_CHARACTERISTIC = -70404,
}

describe('OutletBatteryService', () => {
  let service: OutletBatteryService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let batteryStatusProviderMock: jest.Mocked<BatteryStatusProvider>;
  let hapService: HapService;

  const hapMock = {
    Characteristic: HapCharacteristic,
    HapStatusError: HapStatusError,
    HAPStatus: HAPStatusMock,
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
      api: {
        hap: hapMock,
      },
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
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>>;
    batteryStatusProviderMock = { getStatusLowBattery: jest.fn() } as jest.Mocked<BatteryStatusProvider>;
    service = new OutletBatteryService(ecoFlowAccessoryMock, batteryStatusProviderMock);
    hapService = new HapService('Accessory Outlet Name', HapService.Outlet.UUID);
  });

  describe('updateOutputConsumption', () => {
    it('should set OutputConsumption when it is enabled in configuration', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [OutletCharacteristicType.OutputConsumptionInWatts],
      };
      service = new OutletBatteryService(ecoFlowAccessoryMock, batteryStatusProviderMock);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputConsumption(34.6);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.OutputConsumptionWatts
      ).value;

      expect(actual).toEqual(35);
      expect(logMock.debug.mock.calls).toEqual([
        ['Battery InUse ->', true],
        ['Battery Output Consumption, W ->', 34.6],
      ]);
    });

    it('should not set OutputConsumption when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletBatteryService(ecoFlowAccessoryMock, batteryStatusProviderMock);
      service.initialize();

      service.updateOutputConsumption(34.6);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.OutputConsumptionWatts
      ).value;

      expect(actual).toEqual(0);
      expect(logMock.debug.mock.calls).toEqual([['Battery InUse ->', true]]);
    });
  });

  describe('updateOutputCurrent', () => {
    it('should set OutputCurrent when it is enabled in configuration', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [OutletCharacteristicType.OutputCurrent],
      };
      service = new OutletBatteryService(ecoFlowAccessoryMock, batteryStatusProviderMock);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputCurrent(6.34);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.OutputCurrent).value;

      expect(actual).toEqual(6.34);
      expect(logMock.debug.mock.calls).toEqual([['Battery Output Current, A ->', 6.34]]);
    });

    it('should not set OutputCurrent when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletBatteryService(ecoFlowAccessoryMock, batteryStatusProviderMock);
      service.initialize();

      service.updateOutputCurrent(6.34);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.OutputCurrent).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).not.toHaveBeenCalled();
    });
  });

  describe('updateOutputVoltage', () => {
    it('should set OutputVoltage when it is enabled in configuration', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [OutletCharacteristicType.OutputVoltage],
      };
      service = new OutletBatteryService(ecoFlowAccessoryMock, batteryStatusProviderMock);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputVoltage(182.56);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.OutputVoltage).value;

      expect(actual).toEqual(182.56);
      expect(logMock.debug.mock.calls).toEqual([['Battery Output Voltage, V ->', 182.56]]);
    });

    it('should not set OutputCurrent when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletBatteryService(ecoFlowAccessoryMock, batteryStatusProviderMock);
      service.initialize();

      service.updateOutputVoltage(182.56);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.OutputVoltage).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).not.toHaveBeenCalled();
    });
  });

  describe('updateInputConsumption', () => {
    it('should set InputConsumption when it is enabled in configuration', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [BatteryOutletCharacteristicType.InputConsumptionInWatts],
      };

      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletBatteryService(ecoFlowAccessoryMock, batteryStatusProviderMock);
      service.initialize();

      service.updateInputConsumption(41.1);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.InputConsumptionWatts
      ).value;

      expect(actual).toEqual(41);
      expect(logMock.debug.mock.calls).toEqual([['Battery Input Consumption, W ->', 41.1]]);
    });

    it('should not set InputConsumption when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletBatteryService(ecoFlowAccessoryMock, batteryStatusProviderMock);
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
        additionalCharacteristics: [BatteryOutletCharacteristicType.StatusLowBattery],
      };
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletBatteryService(ecoFlowAccessoryMock, batteryStatusProviderMock);
      service.initialize();
      batteryStatusProviderMock.getStatusLowBattery.mockReturnValue(
        HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_LOW
      );

      service.updateBatteryLevel(19.99, 20);
      const actual = service.service.getCharacteristic(HapCharacteristic.StatusLowBattery).value;

      expect(actual).toEqual(HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
      expect(logMock.debug).toHaveBeenCalledWith('Battery StatusLowBattery ->', 1);
    });

    it('should set normal battery level when it is more than or equal to 20', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [BatteryOutletCharacteristicType.StatusLowBattery],
      };
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletBatteryService(ecoFlowAccessoryMock, batteryStatusProviderMock);
      service.initialize();
      batteryStatusProviderMock.getStatusLowBattery.mockReturnValue(
        HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
      );

      service.updateBatteryLevel(20, 20);
      const actual = service.service.getCharacteristic(HapCharacteristic.StatusLowBattery).value;

      expect(actual).toEqual(HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
      expect(logMock.debug).toHaveBeenCalledWith('Battery StatusLowBattery ->', 0);
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
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [BatteryOutletCharacteristicType.BatteryLevel],
      };
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletBatteryService(ecoFlowAccessoryMock, batteryStatusProviderMock);
      service.initialize();

      service.updateBatteryLevel(87.4, 10);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(87);
      expect(logMock.debug.mock.calls).toEqual([['Battery Battery Level, % ->', 87.4]]);
    });

    it('should not set BatteryLevel when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletBatteryService(ecoFlowAccessoryMock, batteryStatusProviderMock);
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
      const actual = characteristic.setValue(true);

      expect(actual.statusCode).toBe(HAPStatus.READ_ONLY_CHARACTERISTIC);
    });
  });
});
