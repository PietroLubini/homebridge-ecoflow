import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { PowerStreamAllQuotaData } from '@ecoflow/accessories/powerstream/interfaces/powerStreamHttpApiContracts';
import { OutletInvService } from '@ecoflow/accessories/powerstream/services/outletInvService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { AdditionalBatteryCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService, HapStatusError } from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

enum HAPStatus {
  READ_ONLY_CHARACTERISTIC = -70404,
}

describe('OutletInvService', () => {
  let service: OutletInvService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<PowerStreamAllQuotaData>>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let hapService: HapService;

  const hapMock = {
    Characteristic: HapCharacteristic,
    HapStatusError: HapStatusError,
    HAPStatus: HAPStatus,
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
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<PowerStreamAllQuotaData>>;
    service = new OutletInvService(ecoFlowAccessoryMock);
    hapService = new HapService('Accessory Outlet Name', HapService.Outlet.UUID);
  });

  describe('updateOutputConsumption', () => {
    it('should set OutputConsumption when it is enabled in configuration', () => {
      service = new OutletInvService(ecoFlowAccessoryMock, [CharacteristicType.OutputConsumptionInWatts]);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputConsumption(34.6);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.OutputConsumptionWatts
      ).value;

      expect(actual).toEqual(35);
      expect(logMock.debug.mock.calls).toEqual([
        ['INV InUse ->', true],
        ['INV Output Consumption, W ->', 34.6],
      ]);
    });

    it('should not set OutputConsumption when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletInvService(ecoFlowAccessoryMock);
      service.initialize();

      service.updateOutputConsumption(34.6);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.OutputConsumptionWatts
      ).value;

      expect(actual).toEqual(0);
      expect(logMock.debug.mock.calls).toEqual([['INV InUse ->', true]]);
    });
  });

  describe('updateInputConsumption', () => {
    it('should set InputConsumption when it is enabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletInvService(ecoFlowAccessoryMock, [CharacteristicType.InputConsumptionInWatts]);
      service.initialize();

      service.updateInputConsumption(41.1);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.InputConsumptionWatts
      ).value;

      expect(actual).toEqual(41);
      expect(logMock.debug.mock.calls).toEqual([['INV Input Consumption, W ->', 41.1]]);
    });

    it('should not set InputConsumption when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletInvService(ecoFlowAccessoryMock);
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
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletInvService(ecoFlowAccessoryMock, [CharacteristicType.BatteryLevel]);
      service.initialize();

      service.updateBatteryLevel(87.4);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(87);
      expect(logMock.debug.mock.calls).toEqual([['INV Battery Level, % ->', 87.4]]);
    });

    it('should not set BatteryLevel when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletInvService(ecoFlowAccessoryMock);
      service.initialize();

      service.updateBatteryLevel(87.4);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).not.toHaveBeenCalled();
    });
  });

  describe('onOnSet', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.On);
    });

    it('should not allow to set ON value', () => {
      characteristic.value = 1;

      characteristic.setValue(true);
      const actual = characteristic.value;

      expect(actual).toEqual(1);
    });
  });
});
