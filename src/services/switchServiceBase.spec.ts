import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { SwitchServiceBase } from '@ecoflow/services/switchServiceBase';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Characteristic, Logging, PlatformAccessory } from 'homebridge';

class MockSwitchXboostService extends SwitchServiceBase {
  public override async processOnSetOn(): Promise<void> {}
}

describe('SwitchServiceBase', () => {
  let service: MockSwitchXboostService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryBase>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let hapService: HapService;

  const expectedMandatoryCharacteristics: MockCharacteristic[] = [
    {
      UUID: HapCharacteristic.Name.UUID,
      value: 'accessory1 X-Boost',
    },
    {
      UUID: HapCharacteristic.On.UUID,
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
    service = new MockSwitchXboostService(ecoFlowAccessoryMock, 'X-Boost');
    hapService = new HapService('Accessory Outlet Name', HapService.Outlet.UUID);
  });

  describe('initialize', () => {
    it('should add Switch service when it is not added to accessory yet', () => {
      const expected = hapService;
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.addService).toHaveBeenCalledWith(HapService.Switch, 'accessory1 X-Boost', 'X-Boost');
    });

    it('should use existing Switch service when it is already added to accessory', () => {
      const expected = hapService;
      accessoryMock.getServiceById.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.getServiceById).toHaveBeenCalledWith(HapService.Switch, 'X-Boost');
      expect(accessoryMock.addService).not.toHaveBeenCalled();
    });

    it('should add mandatory characteristics when initializing accessory', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expectedMandatoryCharacteristics);
    });
  });

  describe('cleanupCharacteristics', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should remove non registered characteristics when cleanup characteristics is called', () => {
      service.service.addCharacteristic(HapCharacteristic.ActivityInterval);
      service.service.addCharacteristic(HapCharacteristic.Identifier);
      service.cleanupCharacteristics();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expectedMandatoryCharacteristics);
      expect(logMock.warn.mock.calls).toEqual([
        ['[Accessory Outlet Name] Removing obsolete characteristic:', 'Activity Interval'],
        ['[Accessory Outlet Name] Removing obsolete characteristic:', 'Identifier'],
      ]);
    });
  });

  describe('updateState', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should set On state to true when it is requested', () => {
      service.updateState(true);

      const actual = service.service.getCharacteristic(HapCharacteristic.On).value;

      expect(actual).toBeTruthy();
      expect(logMock.debug).toHaveBeenCalledWith('X-Boost State ->', true);
    });

    it('should set On state to false when it is requested', () => {
      service.updateState(false);

      const actual = service.service.getCharacteristic(HapCharacteristic.On).value;

      expect(actual).toBeFalsy();
      expect(logMock.debug).toHaveBeenCalledWith('X-Boost State ->', false);
    });
  });

  describe('updateEnabled', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should set On state to false when service is disabled', () => {
      service.updateState(true);

      service.updateEnabled(false);

      const actual = service.service.getCharacteristic(HapCharacteristic.On).value;

      expect(actual).toBeFalsy();
    });
  });

  describe('updateReachability', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should log when device is offline', () => {
      service.updateReachability(false);

      expect(logMock.warn.mock.calls).toEqual([['[accessory1 X-Boost] Device is offline']]);
    });

    it('should log when device is online', () => {
      service.updateReachability(true);

      expect(logMock.warn.mock.calls).toEqual([['[accessory1 X-Boost] Device is online']]);
    });
  });

  describe('processOnSetOn', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.On);
    });

    it('should revert changing of On state when it is failed', () => {
      characteristic.setValue(true);
      logMock.debug.mockReset();
      const setOnMock = jest.fn();
      service.processOnSetOn = setOnMock;

      characteristic.setValue(false);
      const revertFunc = setOnMock.mock.calls[0][1];
      revertFunc();

      const actual = characteristic.value;

      expect(actual).toBeTruthy();
      expect(logMock.debug.mock.calls).toEqual([['X-Boost State ->', true]]);
    });
  });
});
