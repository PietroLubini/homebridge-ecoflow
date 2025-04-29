import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { PowerStreamAllQuotaData } from '@ecoflow/accessories/powerstream/interfaces/powerStreamHttpApiContracts';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { FanServiceBase } from '@ecoflow/services/fanServiceBase';
import {
  CharacteristicGetHandler,
  CharacteristicSetHandler,
  Characteristic as HapCharacteristic,
  Service as HapService,
  HAPStatus,
  HapStatusError,
} from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

enum HAPStatusMock {
  READ_ONLY_CHARACTERISTIC = -70404,
}

class MockFanService extends FanServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(ecoFlowAccessory, 6000, 'MOCK');
  }

  public override async processOnSetOn(): Promise<void> {}

  public override async processOnSetRotationSpeed(): Promise<void> {}
}

describe('FanServiceBase', () => {
  let service: MockFanService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<PowerStreamAllQuotaData>>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let hapService: HapService;

  const hapMock = {
    Characteristic: HapCharacteristic,
    HapStatusError: HapStatusError,
    HAPStatus: HAPStatusMock,
  } as unknown as HAP;
  EcoFlowHomebridgePlatform.InitCustomCharacteristics(hapMock);

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
    service = new MockFanService(ecoFlowAccessoryMock);
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

    it('should set 100% rotation speed when maximum value is set', () => {
      service.updateRotationSpeed(6000);

      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK RotationSpeed ->', 100);
    });

    it('should set 0% rotation speed when minimum value is set', () => {
      service.updateRotationSpeed(0);

      const actual = characteristic.value;

      expect(actual).toEqual(0);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK RotationSpeed ->', 0);
    });

    it('should set rotation speed when it is requested', () => {
      service.updateRotationSpeed(2115);

      const actual = characteristic.value;

      expect(actual).toEqual(35);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK RotationSpeed ->', 35.25);
    });

    it('should revert changing of rotation speed to value set from UI when sending Set command to device is failed', () => {
      service.updateRotationSpeed(6000);
      logMock.debug.mockReset();
      const processOnSetRotationSpeedMock = jest.fn();
      service.processOnSetRotationSpeed = processOnSetRotationSpeedMock;

      characteristic.setValue(20);
      const revertFunc = processOnSetRotationSpeedMock.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug.mock.calls).toEqual([['MOCK RotationSpeed ->', 100]]);
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

          expect(() => handlerOnSet(true, undefined)).toThrow(
            new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE)
          );
        });

        it('should throw an error when setting On value but service is disabled', () => {
          service.updateEnabled(false);

          expect(() => handlerOnSet(true, undefined)).toThrow(new HapStatusError(HAPStatus.READ_ONLY_CHARACTERISTIC));
          expect(logMock.warn.mock.calls).toEqual([
            ['[accessory1 MOCK] Service is disabled. Setting of "On" is disallowed'],
          ]);
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
          service.updateRotationSpeed(6000);

          const actual = handler(undefined);

          expect(actual).toBe(100);
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

          expect(() => handlerOnSet(123, undefined)).toThrow(
            new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE)
          );
        });

        it('should throw an error when setting RotationSpeed value but service is disabled', () => {
          service.updateEnabled(false);

          expect(() => handlerOnSet(123, undefined)).toThrow(new HapStatusError(HAPStatus.READ_ONLY_CHARACTERISTIC));
          expect(logMock.warn.mock.calls).toEqual([
            ['[accessory1 MOCK] Service is disabled. Setting of "RotationSpeed" is disallowed'],
          ]);
        });

        it('should revert changing of RotationSpeed when sending Set command to device is failed', () => {
          accessoryMock.getServiceById.mockReturnValueOnce(hapService);
          service.initialize();
          const characteristic = service.service.getCharacteristic(HapCharacteristic.RotationSpeed);

          characteristic.setValue(10);
          logMock.debug.mockReset();
          const processOnSetMock = jest.fn();
          service.processOnSetRotationSpeed = processOnSetMock;

          characteristic.setValue(20);
          const revertFunc = processOnSetMock.mock.calls[0][1];
          revertFunc();

          const actual = characteristic.value;

          expect(actual).toBe(10);
          expect(logMock.debug.mock.calls).toEqual([['MOCK RotationSpeed ->', 10]]);
        });
      });
    });
  });
});
