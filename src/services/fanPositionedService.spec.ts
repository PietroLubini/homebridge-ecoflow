import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { PowerStreamAllQuotaData } from '@ecoflow/accessories/powerstream/interfaces/powerStreamHttpApiContracts';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { FanPositionedServiceBase } from '@ecoflow/services/fanPositionedService';
import {
  CharacteristicGetHandler,
  CharacteristicSetHandler,
  Characteristic as HapCharacteristic,
  Service as HapService,
  HAPStatus,
  HapStatusError,
} from 'hap-nodejs';
import { API, Characteristic, Logging, PlatformAccessory } from 'homebridge';

export enum MockFanSpeedType {
  Level1 = 0,
  Level2 = 1,
  Level3 = 2,
  Level4 = 3,
}

class MockFanPositionedService extends FanPositionedServiceBase<MockFanSpeedType, typeof MockFanSpeedType> {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(ecoFlowAccessory, 'MOCK', MockFanSpeedType);
  }

  public override async processOnSetOn(): Promise<void> {}

  public override async processOnSetPositionedRotationSpeed(): Promise<void> {
    return Promise.resolve();
  }
}

describe('FanPositionedServiceBase', () => {
  let service: MockFanPositionedService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<PowerStreamAllQuotaData>>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let hapService: HapService;

  const apiMock = {
    hap: {
      Characteristic: HapCharacteristic,
      HapStatusError: HapStatusError,
    },
  } as unknown as API;
  EcoFlowHomebridgePlatform.InitCharacteristics(apiMock);

  const expectedMandatoryCharacteristics: MockCharacteristic[] = [
    {
      UUID: HapCharacteristic.Name.UUID,
      value: 'Accessory Fan Name',
    },
    {
      UUID: HapCharacteristic.On.UUID,
      value: false,
    },
    {
      UUID: HapCharacteristic.RotationSpeed.UUID,
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
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<PowerStreamAllQuotaData>>;
    service = new MockFanPositionedService(ecoFlowAccessoryMock);
    hapService = new HapService('Accessory Fan Name', HapService.Fan.UUID);
  });

  describe('initialize', () => {
    it('should add Fan service when it is not added to accessory yet', () => {
      const expected = hapService;
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.addService).toHaveBeenCalledWith(HapService.Fan, 'accessory1 MOCK', 'MOCK');
    });

    it('should use existing Fan service when it is already added to accessory', () => {
      const expected = hapService;
      accessoryMock.getServiceById.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.getServiceById).toHaveBeenCalledWith(HapService.Fan, 'MOCK');
      expect(accessoryMock.addService).not.toHaveBeenCalled();
    });

    it('should add Fan characteristics when initializing accessory', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expectedMandatoryCharacteristics);
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

  describe('updateRotationSpeed', () => {
    let characteristic: Characteristic;

    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.RotationSpeed);
    });

    it('should set 0% rotation speed when the first of four values is set', () => {
      service.updatePositionedRotationSpeed(MockFanSpeedType.Level1);

      const actual = characteristic.value;

      expect(actual).toEqual(25);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK RotationSpeed ->', 25);
    });

    it('should set 25% rotation speed when the second of four values is set', () => {
      service.updatePositionedRotationSpeed(MockFanSpeedType.Level2);

      const actual = characteristic.value;

      expect(actual).toEqual(50);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK RotationSpeed ->', 50);
    });

    it('should set 75% rotation speed when the third of four values is set', () => {
      service.updatePositionedRotationSpeed(MockFanSpeedType.Level3);

      const actual = characteristic.value;

      expect(actual).toEqual(75);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK RotationSpeed ->', 75);
    });

    it('should set 100% rotation speed when the fourth of four values is set', () => {
      service.updatePositionedRotationSpeed(MockFanSpeedType.Level4);

      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK RotationSpeed ->', 100);
    });

    it('should revert changing of rotation speed to value set from UI when sending Set command to device is failed', () => {
      service.updatePositionedRotationSpeed(MockFanSpeedType.Level2);
      logMock.debug.mockReset();
      const processOnSetRotationSpeedMock = jest.fn();
      service.processOnSetPositionedRotationSpeed = processOnSetRotationSpeedMock;

      characteristic.setValue(20);
      const revertFunc = processOnSetRotationSpeedMock.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toEqual(50);
      expect(logMock.debug.mock.calls).toEqual([['MOCK RotationSpeed ->', 50]]);
    });
  });

  describe('characteristics', () => {
    function createCharacteristicMock(): jest.Mocked<Characteristic> {
      return {
        setProps: jest.fn(),
        onGet: jest.fn(),
        onSet: jest.fn(),
        updateValue: jest.fn(),
      } as unknown as jest.Mocked<Characteristic>;
    }

    function setupCharacteristicMock(characteristicMock: jest.Mocked<Characteristic>): void {
      characteristicMock.setProps.mockReset();
      characteristicMock.onGet.mockReset();
      characteristicMock.onSet.mockReset();
      characteristicMock.setProps.mockReturnValueOnce(characteristicMock);
      characteristicMock.onGet.mockReturnValueOnce(characteristicMock);
      characteristicMock.onSet.mockReturnValueOnce(characteristicMock);
    }
    const characteristicOnMock: jest.Mocked<Characteristic> = createCharacteristicMock();
    const characteristicRotationSpeedMock: jest.Mocked<Characteristic> = createCharacteristicMock();
    const hapServiceMock: jest.Mocked<HapService> = {
      getCharacteristic: jest.fn(constructor => {
        switch (constructor.name) {
          case HapCharacteristic.On.name:
            return characteristicOnMock;
          case HapCharacteristic.RotationSpeed.name:
            return characteristicRotationSpeedMock;
          default:
            return undefined;
        }
      }),
    } as unknown as jest.Mocked<HapService>;

    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapServiceMock);
      setupCharacteristicMock(characteristicOnMock);
      setupCharacteristicMock(characteristicRotationSpeedMock);
      service.initialize();
    });

    describe('On', () => {
      describe('onGet', () => {
        let handler: CharacteristicGetHandler;

        beforeEach(() => {
          handler = characteristicOnMock.onGet.mock.calls[0][0];
        });

        it('should get On value when device is online', () => {
          service.updateState(true);

          const actual = handler(undefined);

          expect(actual).toBeTruthy();
        });

        it('should throw an error when getting On value but device is offline', () => {
          service.updateReachability(false);

          expect(() => handler(undefined)).toThrow(new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        });
      });

      describe('onSet', () => {
        let handlerOnGet: CharacteristicGetHandler;
        let handlerOnSet: CharacteristicSetHandler;

        beforeEach(() => {
          handlerOnGet = characteristicOnMock.onGet.mock.calls[0][0];
          handlerOnSet = characteristicOnMock.onSet.mock.calls[0][0];
        });

        it('should set On value when device is online', () => {
          handlerOnSet(true, undefined);

          const actual = handlerOnGet(undefined);

          expect(actual).toBeTruthy();
        });

        it('should throw an error when setting On value but device is offline', () => {
          service.updateReachability(false);

          expect(() => handlerOnSet(true, undefined)).toThrow(new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        });

        it('should throw an error when setting On value but service is disabled', () => {
          service.updateEnabled(false);

          expect(() => handlerOnSet(true, undefined)).toThrow(new HapStatusError(HAPStatus.READ_ONLY_CHARACTERISTIC));
          expect(logMock.warn.mock.calls).toEqual([['[accessory1 MOCK] Service is disabled. Setting of "On" is disallowed']]);
        });

        it('should revert changing of On state when it is failed', () => {
          accessoryMock.getServiceById.mockReturnValueOnce(hapService);
          service.initialize();
          const characteristic = service.service.getCharacteristic(HapCharacteristic.On);
          characteristic.setValue(true);
          logMock.debug.mockReset();
          const processOnSetMock = jest.fn();
          service.processOnSetOn = processOnSetMock;

          characteristic.setValue(false);
          const revertFunc = processOnSetMock.mock.calls[0][1];
          revertFunc();

          const actual = characteristic.value;

          expect(actual).toBeTruthy();
          expect(logMock.debug.mock.calls).toEqual([['MOCK State ->', true]]);
        });
      });
    });

    describe('RotationSpeed', () => {
      describe('onGet', () => {
        let handler: CharacteristicGetHandler;

        beforeEach(() => {
          handler = characteristicRotationSpeedMock.onGet.mock.calls[0][0];
        });

        it('should get RotationSpeed value when device is online', () => {
          service.updatePositionedRotationSpeed(MockFanSpeedType.Level2);

          const actual = handler(undefined);

          expect(actual).toBe(50);
        });

        it('should throw an error when getting RotationSpeed value but device is offline', () => {
          service.updateReachability(false);

          expect(() => handler(undefined)).toThrow(new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        });
      });

      describe('onSet', () => {
        let handlerOnGet: CharacteristicGetHandler;
        let handlerOnSet: CharacteristicSetHandler;

        beforeEach(() => {
          handlerOnGet = characteristicRotationSpeedMock.onGet.mock.calls[0][0];
          handlerOnSet = characteristicRotationSpeedMock.onSet.mock.calls[0][0];
        });

        it('should set RotationSpeed value when device is online', () => {
          handlerOnSet(34, undefined);

          const actual = handlerOnGet(undefined);

          expect(actual).toBe(34);
        });

        it('should throw an error when setting RotationSpeed value but device is offline', () => {
          service.updateReachability(false);

          expect(() => handlerOnSet(123, undefined)).toThrow(new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        });

        it('should throw an error when setting RotationSpeed value but service is disabled', () => {
          service.updateEnabled(false);

          expect(() => handlerOnSet(123, undefined)).toThrow(new HapStatusError(HAPStatus.READ_ONLY_CHARACTERISTIC));
          expect(logMock.warn.mock.calls).toEqual([['[accessory1 MOCK] Service is disabled. Setting of "RotationSpeed" is disallowed']]);
        });

        it('should revert changing of RotationSpeed when sending Set command to device is failed', () => {
          accessoryMock.getServiceById.mockReturnValueOnce(hapService);
          service.initialize();
          const characteristic = service.service.getCharacteristic(HapCharacteristic.RotationSpeed);

          characteristic.setValue(60);
          logMock.debug.mockReset();
          const processOnSetMock = jest.fn();
          service.processOnSetPositionedRotationSpeed = processOnSetMock;

          characteristic.setValue(20);
          const revertFunc = processOnSetMock.mock.calls[0][1];
          revertFunc();

          const actual = characteristic.value;

          expect(actual).toBe(50);
          expect(logMock.debug.mock.calls).toEqual([['MOCK RotationSpeed ->', 50]]);
        });
      });
    });
  });
});
