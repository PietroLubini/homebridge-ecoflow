import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Logging, PlatformAccessory } from 'homebridge';

describe('BatteryStatusService', () => {
  let service: BatteryStatusService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryBase>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let hapService: HapService;

  const expectedCharacteristics: MockCharacteristic[] = [
    {
      UUID: HapCharacteristic.Name.UUID,
      value: 'Accessory Battery Name',
    },
    {
      UUID: HapCharacteristic.StatusLowBattery.UUID,
      value: 0,
    },
    {
      UUID: HapCharacteristic.BatteryLevel.UUID,
      value: 0,
    },
    {
      UUID: HapCharacteristic.ChargingState.UUID,
      value: 0,
    },
  ];

  beforeEach(() => {
    logMock = {
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logging>;
    platformMock = {
      Service: HapService,
      Characteristic: HapCharacteristic,
    } as unknown as jest.Mocked<EcoFlowHomebridgePlatform>;
    accessoryMock = {
      getService: jest.fn(),
      addService: jest.fn(),
    } as unknown as jest.Mocked<PlatformAccessory>;
    ecoFlowAccessoryMock = {
      log: logMock,
      platform: platformMock,
      accessory: accessoryMock,
      config: {},
    } as unknown as jest.Mocked<EcoFlowAccessoryBase>;
    service = new BatteryStatusService(ecoFlowAccessoryMock);
    hapService = new HapService('Accessory Battery Name', HapService.Battery.UUID);
  });

  describe('initialize', () => {
    it('should add Battery service when it is not added to accessory yet', () => {
      const expected = hapService;
      ecoFlowAccessoryMock.config.name = 'accessory1';
      accessoryMock.getService.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.addService).toHaveBeenCalledWith(HapService.Battery, 'accessory1', HapService.Battery.UUID);
    });

    it('should use existing Battery service when it is already added to accessory', () => {
      const expected = hapService;
      accessoryMock.getService.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.addService).not.toHaveBeenCalled();
    });

    it('should use existing display name of service when there is no name in configuration', () => {
      accessoryMock.getService.mockReturnValueOnce(hapService);

      service.initialize();
      const actual = service.service.displayName;

      expect(actual).toEqual('Accessory Battery Name');
    });

    it('should use name from configuration as a display name of service when there is name in configuration', () => {
      accessoryMock.getService.mockReturnValueOnce(hapService);
      ecoFlowAccessoryMock.config.name = 'Name from config';

      service.initialize();
      const actual = service.service.displayName;

      expect(actual).toEqual('Name from config');
    });

    it('should add Battery characteristics when initializing accessory', () => {
      accessoryMock.getService.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expectedCharacteristics);
    });
  });

  describe('cleanupCharacteristics', () => {
    beforeEach(() => {
      accessoryMock.getService.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should remove non registered characteristics when cleanup characteristics is called', () => {
      service.service.addCharacteristic(HapCharacteristic.On);
      service.service.addCharacteristic(HapCharacteristic.InUse);
      service.cleanupCharacteristics();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expectedCharacteristics);
      expect(logMock.warn.mock.calls).toEqual([
        ['[Accessory Battery Name] Removing obsolete characteristic:', 'On'],
        ['[Accessory Battery Name] Removing obsolete characteristic:', 'In Use'],
      ]);
    });
  });

  describe('updateStatusLowBattery', () => {
    beforeEach(() => {
      accessoryMock.getService.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should set low battery level when it is less than 20', () => {
      service.updateBatteryLevel(19.99);

      const actual = service.service.getCharacteristic(HapCharacteristic.StatusLowBattery).value;

      expect(actual).toEqual(HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
      expect(logMock.debug).toHaveBeenCalledWith('StatusLowBattery ->', 1);
    });

    it('should set normal battery level when it is more than or equal to 20', () => {
      service.updateBatteryLevel(20);

      const actual = service.service.getCharacteristic(HapCharacteristic.StatusLowBattery).value;

      expect(actual).toEqual(HapCharacteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
      expect(logMock.debug).toHaveBeenCalledWith('StatusLowBattery ->', 0);
    });
  });

  describe('updateBatteryLevel', () => {
    beforeEach(() => {
      accessoryMock.getService.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should set battery level when it is called to be set', () => {
      service.updateBatteryLevel(40.3);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(40);
      expect(logMock.debug).toHaveBeenCalledWith('BatteryLevel ->', 40.3);
    });
  });

  describe('updateChargingState', () => {
    beforeEach(() => {
      accessoryMock.getService.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should set charging state to false when new value is false', () => {
      service.updateChargingState(false);

      const actual = service.service.getCharacteristic(HapCharacteristic.ChargingState).value;

      expect(actual).toBeFalsy();
      expect(logMock.debug).toHaveBeenCalledWith('ChargingState ->', false);
    });

    it('should set charging state to true when new value is true', () => {
      service.updateChargingState(true);

      const actual = service.service.getCharacteristic(HapCharacteristic.ChargingState).value;

      expect(actual).toBeTruthy();
      expect(logMock.debug).toHaveBeenCalledWith('ChargingState ->', true);
    });
  });
});
