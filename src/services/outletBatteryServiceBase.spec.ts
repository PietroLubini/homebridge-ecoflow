import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import {
  AdditionalBatteryCharacteristicType as BatteryCharacteristicType,
  AdditionalBatteryOutletCharacteristicType as BatteryOutletCharacteristicType,
} from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { OutletBatteryServiceBase } from '@ecoflow/services/outletBatteryServiceBase';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { HAP, Logging, PlatformAccessory } from 'homebridge';

class MockOutletService extends OutletBatteryServiceBase {
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryBase,
    batteryStatusProvider: BatteryStatusProvider,
    additionalCharacteristics?: BatteryCharacteristicType[]
  ) {
    super(ecoFlowAccessory, batteryStatusProvider, 'MOCK', additionalCharacteristics);
  }

  public override async processOnSetOn(): Promise<void> {}
}

describe('OutletBatteryServiceBase', () => {
  let service: MockOutletService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryBase>;
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

  const expectedMandatoryCharacteristics: MockCharacteristic[] = [
    {
      UUID: HapCharacteristic.Name.UUID,
      value: 'accessory1 MOCK',
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
    service = new MockOutletService(ecoFlowAccessoryMock, batteryStatusProviderMock);
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
      expect(accessoryMock.addService).toHaveBeenCalledWith(HapService.Outlet, 'accessory1 MOCK', 'MOCK');
    });

    it('should use existing Outlet service when it is already added to accessory', () => {
      const expected = hapService;
      accessoryMock.getServiceById.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.getServiceById).toHaveBeenCalledWith(HapService.Outlet, 'MOCK');
      expect(accessoryMock.addService).not.toHaveBeenCalled();
    });

    it('should not add custom characteristics when initializing accessory without turned on custom characteristics', () => {
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
      service = new MockOutletService(ecoFlowAccessoryMock, batteryStatusProviderMock, [
        BatteryOutletCharacteristicType.InputConsumptionInWatts,
      ]);

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
      service = new MockOutletService(ecoFlowAccessoryMock, batteryStatusProviderMock, [
        BatteryOutletCharacteristicType.BatteryLevel,
      ]);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expected);
    });
  });

  describe('updateInputConsumption', () => {
    it('should set InputConsumption when it is enabled in configuration', () => {
      service = new MockOutletService(ecoFlowAccessoryMock, batteryStatusProviderMock, [
        BatteryOutletCharacteristicType.InputConsumptionInWatts,
      ]);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateInputConsumption(41.1);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.InputConsumptionWatts
      ).value;

      expect(actual).toEqual(41);
      expect(logMock.debug.mock.calls).toEqual([['MOCK Input Consumption, W ->', 41.1]]);
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
      service = new MockOutletService(ecoFlowAccessoryMock, batteryStatusProviderMock, [
        BatteryOutletCharacteristicType.StatusLowBattery,
      ]);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      batteryStatusProviderMock.getStatusLowBattery.mockReturnValue(
        HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_LOW
      );

      service.updateBatteryLevel(19.99, 20);
      const actual = service.service.getCharacteristic(HapCharacteristic.StatusLowBattery).value;

      expect(actual).toEqual(HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
      expect(batteryStatusProviderMock.getStatusLowBattery).toHaveBeenCalledWith(
        platformMock.Characteristic,
        19.99,
        20
      );
      expect(logMock.debug).toHaveBeenCalledWith('MOCK StatusLowBattery ->', 1);
    });

    it('should set normal battery level when it is more than or equal to 20', () => {
      service = new MockOutletService(ecoFlowAccessoryMock, batteryStatusProviderMock, [
        BatteryOutletCharacteristicType.StatusLowBattery,
      ]);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      batteryStatusProviderMock.getStatusLowBattery.mockReturnValue(
        HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
      );

      service.updateBatteryLevel(20, 20);
      const actual = service.service.getCharacteristic(HapCharacteristic.StatusLowBattery).value;

      expect(actual).toEqual(HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
      expect(batteryStatusProviderMock.getStatusLowBattery).toHaveBeenCalledWith(platformMock.Characteristic, 20, 20);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK StatusLowBattery ->', 0);
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
      service = new MockOutletService(ecoFlowAccessoryMock, batteryStatusProviderMock, [
        BatteryOutletCharacteristicType.BatteryLevel,
      ]);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateBatteryLevel(87.4, 10);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(87);
      expect(logMock.debug.mock.calls).toEqual([['MOCK Battery Level, % ->', 87.4]]);
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

  describe('updateChargingState', () => {
    it('should set charging state to false when input power consumption is 0 Watt', () => {
      service = new MockOutletService(ecoFlowAccessoryMock, batteryStatusProviderMock, [
        BatteryOutletCharacteristicType.ChargingState,
      ]);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateChargingState(false);

      const actual = service.service.getCharacteristic(HapCharacteristic.ChargingState).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK ChargingState ->', false);
    });

    it('should set charging state to true when input power consumption is more than 0 Watt', () => {
      service = new MockOutletService(ecoFlowAccessoryMock, batteryStatusProviderMock, [
        BatteryOutletCharacteristicType.ChargingState,
      ]);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateChargingState(true);

      const actual = service.service.getCharacteristic(HapCharacteristic.ChargingState).value;

      expect(actual).toEqual(1);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK ChargingState ->', true);
    });
  });
});
