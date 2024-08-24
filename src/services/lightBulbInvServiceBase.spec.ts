import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { PowerStreamAllQuotaData } from '@ecoflow/accessories/powerstream/interfaces/httpApiPowerStreamContracts';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { LightBulbServiceBase } from '@ecoflow/services/lightBulbServiceBase';
import { Characteristic as HapCharacteristic, Service as HapService, HapStatusError } from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

enum HAPStatus {
  READ_ONLY_CHARACTERISTIC = -70404,
}

class MockLightBulbInvService extends LightBulbServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(ecoFlowAccessory, 1023, 'MOCK');
  }

  public override async setOn(): Promise<void> {}

  public override async setBrightness(): Promise<void> {}
}

describe('LightBulbServiceBase', () => {
  let service: MockLightBulbInvService;
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

  const expectedMandatoryCharacteristics: MockCharacteristic[] = [
    {
      UUID: HapCharacteristic.Name.UUID,
      value: 'Accessory Bulb Name',
    },
    {
      UUID: HapCharacteristic.On.UUID,
      value: false,
    },
    {
      UUID: HapCharacteristic.Brightness.UUID,
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
    service = new MockLightBulbInvService(ecoFlowAccessoryMock);
    hapService = new HapService('Accessory Bulb Name', HapService.Lightbulb.UUID);
  });

  describe('initialize', () => {
    it('should add Lightbulb service when it is not added to accessory yet', () => {
      const expected = hapService;
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.addService).toHaveBeenCalledWith(HapService.Lightbulb, 'accessory1 MOCK', 'MOCK');
    });

    it('should use existing Lightbulb service when it is already added to accessory', () => {
      const expected = hapService;
      accessoryMock.getServiceById.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.getServiceById).toHaveBeenCalledWith(HapService.Lightbulb, 'MOCK');
      expect(accessoryMock.addService).not.toHaveBeenCalled();
    });

    it('should add Lightbulb characteristics when initializing accessory', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expectedMandatoryCharacteristics);
    });
  });

  describe('setOn', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should not allow to set value when it is updated from UI', () => {
      const onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
      onCharacteristic.value = false;

      onCharacteristic.setValue(true);
      const actual = onCharacteristic.value;

      expect(actual).toBeFalsy();
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
      expect(logMock.debug).toHaveBeenCalledWith('MOCK State ->', true);
    });
  });

  describe('updateBrightness', () => {
    let characteristic: Characteristic;

    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.Brightness);
    });

    it('should set 100% brightness when maximum value is set', () => {
      service.updateBrightness(1023);

      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Brightness ->', 100);
    });

    it('should set 0% brightness when minimum value is set', () => {
      service.updateBrightness(0);

      const actual = characteristic.value;

      expect(actual).toEqual(0);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Brightness ->', 0);
    });

    it('should set brightness when it is requested', () => {
      service.updateBrightness(468.0225);

      const actual = characteristic.value;

      expect(actual).toEqual(46);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Brightness ->', 45.75);
    });

    it('should revert changing of Brightness state to value set from UI when sending Set command to device is failed', () => {
      service.updateBrightness(1023);
      logMock.debug.mockReset();
      const setBrightnessMock = jest.fn();
      service.setBrightness = setBrightnessMock;

      characteristic.setValue(20);
      const revertFunc = setBrightnessMock.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug.mock.calls).toEqual([['MOCK Brightness ->', 100]]);
    });
  });

  describe('onOnSet', () => {
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
      service.setOn = setOnMock;

      characteristic.setValue(false);
      const revertFunc = setOnMock.mock.calls[0][1];
      revertFunc();

      const actual = characteristic.value;

      expect(actual).toBeTruthy();
      expect(logMock.debug.mock.calls).toEqual([['MOCK State ->', true]]);
    });
  });

  describe('onBrightnessSet', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.Brightness);
    });

    it('should revert changing of Brightness state when sending Set command to device is failed', () => {
      characteristic.setValue(100);
      logMock.debug.mockReset();
      const setBrightnessMock = jest.fn();
      service.setBrightness = setBrightnessMock;

      characteristic.setValue(20);
      const revertFunc = setBrightnessMock.mock.calls[0][1];
      revertFunc();

      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug.mock.calls).toEqual([['MOCK Brightness ->', 100]]);
    });
  });
});
