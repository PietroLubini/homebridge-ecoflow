import { EcoFlowAccessoryWithQuota } from '@ecoflow/accessories/ecoFlowAccessory';
import { PowerStreamAllQuotaData } from '@ecoflow/accessories/powerstream/interfaces/httpApiPowerStreamContracts';
import { OutletService } from '@ecoflow/accessories/powerstream/services/outletService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { AdditionalBatteryCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import {
  Characteristic as HapCharacteristic,
  HAPStatus as HAPHAPStatus,
  Service as HapService,
  HapStatusError,
} from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

enum HAPStatus {
  READ_ONLY_CHARACTERISTIC = -70404,
}

describe('OutletService', () => {
  let service: OutletService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuota<PowerStreamAllQuotaData>>;
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

  const expectedMandatoryCharacteristics: MockCharacteristic[] = [
    {
      UUID: HapCharacteristic.Name.UUID,
      value: 'accessory1 PV',
    },
    {
      UUID: HapCharacteristic.On.UUID,
      value: false,
    },
    {
      UUID: HapCharacteristic.OutletInUse.UUID,
      value: false,
    },
  ];

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
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuota<PowerStreamAllQuotaData>>;
    service = new OutletService('PV', undefined, ecoFlowAccessoryMock);
    hapService = new HapService('Accessory Outlet Name', HapService.Outlet.UUID);
  });

  describe('initialize', () => {
    it('should add Outlet service when it is not added to accessory yet', () => {
      const expected = hapService;
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.addService).toHaveBeenCalledWith(HapService.Outlet, 'accessory1 PV', 'PV');
    });

    it('should use existing Outlet service when it is already added to accessory', () => {
      const expected = hapService;
      accessoryMock.getServiceById.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.getServiceById).toHaveBeenCalledWith(HapService.Outlet, 'PV');
      expect(accessoryMock.addService).not.toHaveBeenCalled();
    });

    it('should add Battery characteristics when initializing accessory without turned on custom characteristics', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expectedMandatoryCharacteristics);
    });

    it('should add InputConsumptionWatts characteristic when it is enabled in configuration', () => {
      const expected = [
        ...expectedMandatoryCharacteristics,
        {
          UUID: CustomCharacteristics.PowerConsumption.InputConsumptionWatts.UUID,
          value: 0,
        },
      ];
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);
      service = new OutletService('PV', [CharacteristicType.InputConsumptionInWatts], ecoFlowAccessoryMock);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expected);
    });

    it('should add OutputConsumptionInWatts characteristic when it is enabled in configuration', () => {
      const expected = [
        ...expectedMandatoryCharacteristics,
        {
          UUID: CustomCharacteristics.PowerConsumption.OutputConsumptionWatts.UUID,
          value: 0,
        },
      ];
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);
      service = new OutletService('PV', [CharacteristicType.OutputConsumptionInWatts], ecoFlowAccessoryMock);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expected);
    });

    it('should add BatteryLevel characteristic when it is enabled in configuration', () => {
      const expected = [
        ...expectedMandatoryCharacteristics,
        {
          UUID: HapCharacteristic.BatteryLevel.UUID,
          value: 0,
        },
      ];
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);
      service = new OutletService('PV', [CharacteristicType.BatteryLevel], ecoFlowAccessoryMock);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expected);
    });
  });

  describe('updateState', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should throw error when when tries to updateState', () => {
      expect(() => service.updateState(true)).toThrow(new HapStatusError(HAPHAPStatus.READ_ONLY_CHARACTERISTIC));
    });
  });

  describe('updateOutputConsumption', () => {
    it('should set OutputConsumption when it is enabled in configuration', () => {
      service = new OutletService('INV', [CharacteristicType.OutputConsumptionInWatts], ecoFlowAccessoryMock);
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
      service = new OutletService('INV', undefined, ecoFlowAccessoryMock);
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
      service = new OutletService('BAT', [CharacteristicType.InputConsumptionInWatts], ecoFlowAccessoryMock);
      service.initialize();

      service.updateInputConsumption(41.1);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.InputConsumptionWatts
      ).value;

      expect(actual).toEqual(41);
      expect(logMock.debug.mock.calls).toEqual([['BAT Input Consumption, W ->', 41.1]]);
    });

    it('should not set InputConsumption when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletService('BAT', undefined, ecoFlowAccessoryMock);
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
      service = new OutletService('BAT', [CharacteristicType.BatteryLevel], ecoFlowAccessoryMock);
      service.initialize();

      service.updateBatteryLevel(87.4);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(87);
      expect(logMock.debug.mock.calls).toEqual([['BAT Battery Level, % ->', 87.4]]);
    });

    it('should not set BatteryLevel when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service = new OutletService('BAT', undefined, ecoFlowAccessoryMock);
      service.initialize();

      service.updateBatteryLevel(87.4);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).not.toHaveBeenCalled();
    });
  });

  describe('onSet', () => {
    let onCharacteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
    });

    it('should not allow to set ON value', () => {
      onCharacteristic.value = 1;

      onCharacteristic.setValue(true);
      const actual = onCharacteristic.value;

      expect(actual).toEqual(1);
    });
  });
});
