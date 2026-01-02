import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { GlacierAllQuotaData } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import {
  CurrentHeatingCoolingStateType,
  FridgeStateType,
  TargetHeatingCoolingStateType,
  TemperatureDisplayUnitsType,
} from '@ecoflow/characteristics/characteristicContracts';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { ThermostatFridgeServiceBase } from '@ecoflow/services/thermostatFridgeServiceBase';
import {
  CharacteristicGetHandler,
  CharacteristicSetHandler,
  Characteristic as HapCharacteristic,
  Service as HapService,
  HAPStatus,
  HapStatusError,
} from 'hap-nodejs';
import { API, Characteristic, Logging, PlatformAccessory } from 'homebridge';

class MockThermostatFridgeService extends ThermostatFridgeServiceBase {
  static MaxTemperature = 5;
  static MinTemperature = -20;

  constructor(ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(ecoFlowAccessory, MockThermostatFridgeService.MinTemperature, MockThermostatFridgeService.MaxTemperature, 'MOCK');
  }

  public override async processOnSetTargetTemperature(): Promise<void> {}

  public override async processOnSetTargetState(): Promise<void> {}

  public override async processOnSetTemperatureDisplayUnits(): Promise<void> {}
}

describe('ThermostatFridgeServiceBase', () => {
  let service: MockThermostatFridgeService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>>;
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
      value: 'accessory1 MOCK',
    },
    {
      UUID: HapCharacteristic.CurrentTemperature.UUID,
      value: 0,
    },
    {
      UUID: HapCharacteristic.TargetTemperature.UUID,
      value: 5,
    },
    {
      UUID: HapCharacteristic.CurrentHeatingCoolingState.UUID,
      value: CurrentHeatingCoolingStateType.Off,
    },
    {
      UUID: HapCharacteristic.TargetHeatingCoolingState.UUID,
      value: TargetHeatingCoolingStateType.Off,
    },
    {
      UUID: HapCharacteristic.TemperatureDisplayUnits.UUID,
      value: TemperatureDisplayUnitsType.Celsius,
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
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>>;
    service = new MockThermostatFridgeService(ecoFlowAccessoryMock);
    hapService = new HapService('Accessory Thermostat Name', HapService.Lightbulb.UUID);
  });

  describe('initialize', () => {
    it('should add Thermostat service when it is not added to accessory yet', () => {
      const expected = hapService;
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.addService).toHaveBeenCalledWith(HapService.Thermostat, 'accessory1 MOCK', 'MOCK');
    });

    it('should use existing Thermostat service when it is already added to accessory', () => {
      const expected = hapService;
      accessoryMock.getServiceById.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.getServiceById).toHaveBeenCalledWith(HapService.Thermostat, 'MOCK');
      expect(accessoryMock.addService).not.toHaveBeenCalled();
    });

    it('should add Thermostat characteristics when initializing accessory', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expectedMandatoryCharacteristics);
    });
  });

  describe('updateCurrentTemperature', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should set current temperature to value when it is requested', () => {
      service.updateCurrentTemperature(2);

      const actual = service.service.getCharacteristic(HapCharacteristic.CurrentTemperature).value;

      expect(actual).toEqual(2);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Current Temperature ->', 2);
    });

    it('should set current temperature to max allowed value when update requested for value that exceeds it', () => {
      service.updateCurrentTemperature(10);

      const actual = service.service.getCharacteristic(HapCharacteristic.CurrentTemperature).value;

      expect(actual).toEqual(MockThermostatFridgeService.MaxTemperature);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Current Temperature ->', 10);
    });

    it('should set current temperature to min allowed value when update requested for value that is below it', () => {
      service.updateCurrentTemperature(-50);

      const actual = service.service.getCharacteristic(HapCharacteristic.CurrentTemperature).value;

      expect(actual).toEqual(MockThermostatFridgeService.MinTemperature);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Current Temperature ->', -50);
    });
  });

  describe('updateTargetTemperature', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should set target temperature to value when it is requested', () => {
      service.updateTargetTemperature(2);

      const actual = service.service.getCharacteristic(HapCharacteristic.TargetTemperature).value;

      expect(actual).toEqual(2);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Target Temperature ->', 2);
    });

    it('should set target temperature to max allowed value when update requested for value that exceeds it', () => {
      service.updateTargetTemperature(10);

      const actual = service.service.getCharacteristic(HapCharacteristic.TargetTemperature).value;

      expect(actual).toEqual(MockThermostatFridgeService.MaxTemperature);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Target Temperature ->', 10);
    });

    it('should set target temperature to min allowed value when update requested for value that is below it', () => {
      service.updateTargetTemperature(-50);

      const actual = service.service.getCharacteristic(HapCharacteristic.TargetTemperature).value;

      expect(actual).toEqual(MockThermostatFridgeService.MinTemperature);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Target Temperature ->', -50);
    });
  });

  describe('updateCurrentState', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should set current state to Cool when it is requested', () => {
      service.updateCurrentState(FridgeStateType.On);

      const actual = service.service.getCharacteristic(HapCharacteristic.CurrentHeatingCoolingState).value;

      expect(actual).toEqual(2);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Current State ->', 2);
    });

    it('should set current state to Off when it is requested', () => {
      service.updateCurrentState(FridgeStateType.On);
      service.updateCurrentState(FridgeStateType.Off);

      const actual = service.service.getCharacteristic(HapCharacteristic.CurrentHeatingCoolingState).value;

      expect(actual).toEqual(0);
      expect(logMock.debug.mock.calls).toEqual([
        ['MOCK Current State ->', 2],
        ['MOCK Current State ->', 0],
      ]);
    });

    it('should set current state to Off when update requested for unsupported value', () => {
      service.updateCurrentState(100 as FridgeStateType);

      const actual = service.service.getCharacteristic(HapCharacteristic.CurrentHeatingCoolingState).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Current State ->', 0);
    });
  });

  describe('updateTargetState', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should set target state to Cool when it is requested', () => {
      service.updateTargetState(FridgeStateType.On);

      const actual = service.service.getCharacteristic(HapCharacteristic.TargetHeatingCoolingState).value;

      expect(actual).toEqual(2);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Target State ->', 2);
    });

    it('should set target state to Off when it is requested', () => {
      service.updateTargetState(FridgeStateType.On);
      service.updateTargetState(FridgeStateType.Off);

      const actual = service.service.getCharacteristic(HapCharacteristic.TargetHeatingCoolingState).value;

      expect(actual).toEqual(0);
      expect(logMock.debug.mock.calls).toEqual([
        ['MOCK Target State ->', 2],
        ['MOCK Target State ->', 0],
      ]);
    });

    it('should set target state to Off when update requested for unsupported value', () => {
      service.updateTargetState(100 as FridgeStateType);

      const actual = service.service.getCharacteristic(HapCharacteristic.TargetHeatingCoolingState).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Target State ->', 0);
    });
  });

  describe('updateTemperatureDisplayUnits', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should set temperature display units to Fahrenheit when it is requested', () => {
      service.updateTemperatureDisplayUnits(TemperatureDisplayUnitsType.Fahrenheit);

      const actual = service.service.getCharacteristic(HapCharacteristic.TemperatureDisplayUnits).value;

      expect(actual).toEqual(1);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Temperature Display Units ->', 1);
    });

    it('should set temperature display units to Celsius when it is requested', () => {
      service.updateTemperatureDisplayUnits(TemperatureDisplayUnitsType.Fahrenheit);
      service.updateTemperatureDisplayUnits(TemperatureDisplayUnitsType.Celsius);

      const actual = service.service.getCharacteristic(HapCharacteristic.TargetHeatingCoolingState).value;

      expect(actual).toEqual(0);
      expect(logMock.debug.mock.calls).toEqual([
        ['MOCK Temperature Display Units ->', 1],
        ['MOCK Temperature Display Units ->', 0],
      ]);
    });
  });

  describe('characteristics', () => {
    function createCharacteristicMock(): jest.Mocked<Characteristic> {
      return {
        setProps: jest.fn(),
        setPropsPerms: jest.fn(),
        onGet: jest.fn(),
        onSet: jest.fn(),
        updateValue: jest.fn(),
      } as unknown as jest.Mocked<Characteristic>;
    }

    function setupCharacteristicMock(characteristicMock: jest.Mocked<Characteristic>): void {
      characteristicMock.setProps.mockReset();
      characteristicMock.setPropsPerms.mockReset();
      characteristicMock.onGet.mockReset();
      characteristicMock.onSet.mockReset();
      characteristicMock.setProps.mockReturnValueOnce(characteristicMock);
      characteristicMock.setPropsPerms.mockReturnValueOnce(characteristicMock);
      characteristicMock.onGet.mockReturnValueOnce(characteristicMock);
      characteristicMock.onSet.mockReturnValueOnce(characteristicMock);
    }

    const characteristicCurrentTemperatureMock: jest.Mocked<Characteristic> = createCharacteristicMock();
    const characteristicTargetTemperatureMock: jest.Mocked<Characteristic> = createCharacteristicMock();
    const characteristicCurrentHeatingCoolingStateMock: jest.Mocked<Characteristic> = createCharacteristicMock();
    const characteristicTargetHeatingCoolingStateMock: jest.Mocked<Characteristic> = createCharacteristicMock();
    const characteristicTemperatureDisplayUnitsMock: jest.Mocked<Characteristic> = createCharacteristicMock();
    const hapServiceMock: jest.Mocked<HapService> = {
      getCharacteristic: jest.fn(constructor => {
        switch (constructor.name) {
          case HapCharacteristic.CurrentTemperature.name:
            return characteristicCurrentTemperatureMock;
          case HapCharacteristic.TargetTemperature.name:
            return characteristicTargetTemperatureMock;
          case HapCharacteristic.CurrentHeatingCoolingState.name:
            return characteristicCurrentHeatingCoolingStateMock;
          case HapCharacteristic.TargetHeatingCoolingState.name:
            return characteristicTargetHeatingCoolingStateMock;
          case HapCharacteristic.TemperatureDisplayUnits.name:
            return characteristicTemperatureDisplayUnitsMock;
          default:
            return undefined;
        }
      }),
      setCharacteristic: jest.fn(),
    } as unknown as jest.Mocked<HapService>;

    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapServiceMock);
      setupCharacteristicMock(characteristicCurrentTemperatureMock);
      setupCharacteristicMock(characteristicTargetTemperatureMock);
      setupCharacteristicMock(characteristicCurrentHeatingCoolingStateMock);
      setupCharacteristicMock(characteristicTargetHeatingCoolingStateMock);
      setupCharacteristicMock(characteristicTemperatureDisplayUnitsMock);
      service.initialize();
    });

    describe('CurrentTemperature', () => {
      describe('onGet', () => {
        let handler: CharacteristicGetHandler;

        beforeEach(() => {
          handler = characteristicCurrentTemperatureMock.onGet.mock.calls[0][0];
        });

        it('should get CurrentTemperature value when device is online', () => {
          service.updateCurrentTemperature(4.3);

          const actual = handler(undefined);

          expect(actual).toBe(4.3);
        });

        it('should throw an error when getting CurrentTemperature value but device is offline', () => {
          service.updateReachability(false);

          expect(() => handler(undefined)).toThrow(new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        });
      });
    });

    describe('TargetTemperature', () => {
      describe('onGet', () => {
        let handler: CharacteristicGetHandler;

        beforeEach(() => {
          handler = characteristicTargetTemperatureMock.onGet.mock.calls[0][0];
        });

        it('should get TargetTemperature value when device is online', () => {
          service.updateTargetTemperature(3);

          const actual = handler(undefined);

          expect(actual).toBe(3);
        });

        it('should throw an error when getting TargetTemperature value but device is offline', () => {
          service.updateReachability(false);

          expect(() => handler(undefined)).toThrow(new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        });
      });

      describe('onSet', () => {
        let handlerOnGet: CharacteristicGetHandler;
        let handlerOnSet: CharacteristicSetHandler;

        beforeEach(() => {
          handlerOnGet = characteristicTargetTemperatureMock.onGet.mock.calls[0][0];
          handlerOnSet = characteristicTargetTemperatureMock.onSet.mock.calls[0][0];
        });

        it('should set TargetTemperature value when device is online', () => {
          handlerOnSet(4, undefined);

          const actual = handlerOnGet(undefined);

          expect(actual).toBe(4);
        });

        it('should throw an error when setting TargetTemperature value but device is offline', () => {
          service.updateReachability(false);

          expect(() => handlerOnSet(1, undefined)).toThrow(new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        });

        it('should throw an error when setting on value but service is disabled', () => {
          service.updateEnabled(false);

          expect(() => handlerOnSet(1, undefined)).toThrow(new HapStatusError(HAPStatus.READ_ONLY_CHARACTERISTIC));
          expect(logMock.warn.mock.calls).toEqual([['[accessory1 MOCK] Service is disabled. Setting of "TargetTemperature" is disallowed']]);
        });

        it('should revert changing of TargetTemperature when sending Set command to device is failed', () => {
          accessoryMock.getServiceById.mockReturnValueOnce(hapService);
          service.initialize();
          const characteristic = service.service.getCharacteristic(HapCharacteristic.TargetTemperature);

          characteristic.setValue(-3);
          logMock.debug.mockReset();
          const processOnSetMock = jest.fn();
          service.processOnSetTargetTemperature = processOnSetMock;

          characteristic.setValue(1);
          const revertFunc = processOnSetMock.mock.calls[0][1];
          revertFunc();

          const actual = characteristic.value;

          expect(actual).toBe(-3);
          expect(logMock.debug.mock.calls).toEqual([['MOCK Target Temperature ->', -3]]);
        });
      });
    });

    describe('CurrentHeatingCoolingState', () => {
      describe('onGet', () => {
        let handler: CharacteristicGetHandler;

        beforeEach(() => {
          handler = characteristicCurrentHeatingCoolingStateMock.onGet.mock.calls[0][0];
        });

        it('should get CurrentHeatingCoolingState value when device is online', () => {
          service.updateCurrentState(FridgeStateType.On);

          const actual = handler(undefined);

          expect(actual).toBe(CurrentHeatingCoolingStateType.Cool);
        });

        it('should throw an error when getting CurrentHeatingCoolingState value but device is offline', () => {
          service.updateReachability(false);

          expect(() => handler(undefined)).toThrow(new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        });
      });
    });

    describe('TargetHeatingCoolingState', () => {
      describe('onGet', () => {
        let handler: CharacteristicGetHandler;

        beforeEach(() => {
          handler = characteristicTargetHeatingCoolingStateMock.onGet.mock.calls[0][0];
        });

        it('should get TargetHeatingCoolingState value when device is online', () => {
          service.updateTargetState(FridgeStateType.On);

          const actual = handler(undefined);

          expect(actual).toBe(TargetHeatingCoolingStateType.Cool);
        });

        it('should throw an error when getting TargetHeatingCoolingState value but device is offline', () => {
          service.updateReachability(false);

          expect(() => handler(undefined)).toThrow(new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        });
      });

      describe('onSet', () => {
        let handlerOnGet: CharacteristicGetHandler;
        let handlerOnSet: CharacteristicSetHandler;

        beforeEach(() => {
          handlerOnGet = characteristicTargetHeatingCoolingStateMock.onGet.mock.calls[0][0];
          handlerOnSet = characteristicTargetHeatingCoolingStateMock.onSet.mock.calls[0][0];
        });

        it('should set TargetHeatingCoolingState value when device is online', () => {
          handlerOnSet(TargetHeatingCoolingStateType.Cool, undefined);

          const actual = handlerOnGet(undefined);

          expect(actual).toBe(TargetHeatingCoolingStateType.Cool);
        });

        it('should throw an error when setting TargetHeatingCoolingState value but device is offline', () => {
          service.updateReachability(false);

          expect(() => handlerOnSet(TargetHeatingCoolingStateType.Cool, undefined)).toThrow(
            new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE)
          );
        });

        it('should throw an error when setting on value but service is disabled', () => {
          service.updateEnabled(false);

          expect(() => handlerOnSet(TargetHeatingCoolingStateType.Cool, undefined)).toThrow(new HapStatusError(HAPStatus.READ_ONLY_CHARACTERISTIC));
          expect(logMock.warn.mock.calls).toEqual([['[accessory1 MOCK] Service is disabled. Setting of "TargetHeatingCoolingState" is disallowed']]);
        });

        it('should revert changing of TargetHeatingCoolingState when sending Set command to device is failed', () => {
          accessoryMock.getServiceById.mockReturnValueOnce(hapService);
          service.initialize();
          const characteristic = service.service.getCharacteristic(HapCharacteristic.TargetHeatingCoolingState);

          characteristic.setValue(TargetHeatingCoolingStateType.Cool);
          logMock.debug.mockReset();
          const processOnSetMock = jest.fn();
          service.processOnSetTargetState = processOnSetMock;

          characteristic.setValue(TargetHeatingCoolingStateType.Off);
          const revertFunc = processOnSetMock.mock.calls[0][1];
          revertFunc();

          const actual = characteristic.value;

          expect(actual).toBe(TargetHeatingCoolingStateType.Cool);
          expect(logMock.debug.mock.calls).toEqual([['MOCK Target State ->', TargetHeatingCoolingStateType.Cool]]);
        });
      });
    });

    describe('TemperatureDisplayUnits', () => {
      describe('onGet', () => {
        let handler: CharacteristicGetHandler;

        beforeEach(() => {
          handler = characteristicTemperatureDisplayUnitsMock.onGet.mock.calls[0][0];
        });

        it('should get TemperatureDisplayUnits value when device is online', () => {
          service.updateTemperatureDisplayUnits(TemperatureDisplayUnitsType.Fahrenheit);

          const actual = handler(undefined);

          expect(actual).toBe(TemperatureDisplayUnitsType.Fahrenheit);
        });

        it('should throw an error when getting TemperatureDisplayUnits value but device is offline', () => {
          service.updateReachability(false);

          expect(() => handler(undefined)).toThrow(new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        });
      });

      describe('onSet', () => {
        let handlerOnGet: CharacteristicGetHandler;
        let handlerOnSet: CharacteristicSetHandler;

        beforeEach(() => {
          handlerOnGet = characteristicTemperatureDisplayUnitsMock.onGet.mock.calls[0][0];
          handlerOnSet = characteristicTemperatureDisplayUnitsMock.onSet.mock.calls[0][0];
        });

        it('should set TemperatureDisplayUnits value when device is online', () => {
          handlerOnSet(TemperatureDisplayUnitsType.Fahrenheit, undefined);

          const actual = handlerOnGet(undefined);

          expect(actual).toBe(TemperatureDisplayUnitsType.Fahrenheit);
        });

        it('should throw an error when setting TemperatureDisplayUnits value but device is offline', () => {
          service.updateReachability(false);

          expect(() => handlerOnSet(TemperatureDisplayUnitsType.Fahrenheit, undefined)).toThrow(
            new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE)
          );
        });

        it('should throw an error when setting on value but service is disabled', () => {
          service.updateEnabled(false);

          expect(() => handlerOnSet(TemperatureDisplayUnitsType.Fahrenheit, undefined)).toThrow(
            new HapStatusError(HAPStatus.READ_ONLY_CHARACTERISTIC)
          );
          expect(logMock.warn.mock.calls).toEqual([['[accessory1 MOCK] Service is disabled. Setting of "TemperatureDisplayUnits" is disallowed']]);
        });

        it('should revert changing of TemperatureDisplayUnits when sending Set command to device is failed', () => {
          accessoryMock.getServiceById.mockReturnValueOnce(hapService);
          service.initialize();
          const characteristic = service.service.getCharacteristic(HapCharacteristic.TemperatureDisplayUnits);

          characteristic.setValue(TemperatureDisplayUnitsType.Fahrenheit);
          logMock.debug.mockReset();
          const processOnSetMock = jest.fn();
          service.processOnSetTemperatureDisplayUnits = processOnSetMock;

          characteristic.setValue(TemperatureDisplayUnitsType.Celsius);
          const revertFunc = processOnSetMock.mock.calls[0][1];
          revertFunc();

          const actual = characteristic.value;

          expect(actual).toBe(TemperatureDisplayUnitsType.Fahrenheit);
          expect(logMock.debug.mock.calls).toEqual([['MOCK Temperature Display Units ->', TemperatureDisplayUnitsType.Fahrenheit]]);
        });
      });
    });
  });
});
