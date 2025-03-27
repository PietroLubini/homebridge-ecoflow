import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { GlacierAllQuotaData } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import {
  CoolerStateType,
  TemperatureDisplayUnitsType,
  ThermostatFridgeServiceBase,
} from '@ecoflow/services/thermostatFridgeServiceBase';
import { Characteristic as HapCharacteristic, Service as HapService, HapStatusError } from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

enum HAPStatus {
  READ_ONLY_CHARACTERISTIC = -70404,
}

class MockThermostatFridgeService extends ThermostatFridgeServiceBase {
  static MaxTemperature = 5;
  static MinTemperature = -20;

  constructor(ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(
      ecoFlowAccessory,
      MockThermostatFridgeService.MinTemperature,
      MockThermostatFridgeService.MaxTemperature,
      'MOCK'
    );
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

  const hapMock = {
    Characteristic: HapCharacteristic,
    HapStatusError: HapStatusError,
    HAPStatus: HAPStatus,
  } as unknown as HAP;
  EcoFlowHomebridgePlatform.InitCustomCharacteristics(hapMock);

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
      value: CoolerStateType.Off,
    },
    {
      UUID: HapCharacteristic.TargetHeatingCoolingState.UUID,
      value: CoolerStateType.Off,
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
      service.updateCurrentState(CoolerStateType.Cool);

      const actual = service.service.getCharacteristic(HapCharacteristic.CurrentHeatingCoolingState).value;

      expect(actual).toEqual(2);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Current State ->', 2);
    });

    it('should set current state to Off when it is requested', () => {
      service.updateCurrentState(CoolerStateType.Cool);
      service.updateCurrentState(CoolerStateType.Off);

      const actual = service.service.getCharacteristic(HapCharacteristic.CurrentHeatingCoolingState).value;

      expect(actual).toEqual(0);
      expect(logMock.debug.mock.calls).toEqual([
        ['MOCK Current State ->', 2],
        ['MOCK Current State ->', 0],
      ]);
    });

    it('should set current state to Off when update requested for unsupported value', () => {
      service.updateCurrentState(1 as CoolerStateType);

      const actual = service.service.getCharacteristic(HapCharacteristic.CurrentHeatingCoolingState).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Current State ->', 1);
    });
  });

  describe('updateTargetState', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should set target state to Cool when it is requested', () => {
      service.updateTargetState(CoolerStateType.Cool);

      const actual = service.service.getCharacteristic(HapCharacteristic.TargetHeatingCoolingState).value;

      expect(actual).toEqual(2);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Target State ->', 2);
    });

    it('should set target state to Off when it is requested', () => {
      service.updateTargetState(CoolerStateType.Cool);
      service.updateTargetState(CoolerStateType.Off);

      const actual = service.service.getCharacteristic(HapCharacteristic.TargetHeatingCoolingState).value;

      expect(actual).toEqual(0);
      expect(logMock.debug.mock.calls).toEqual([
        ['MOCK Target State ->', 2],
        ['MOCK Target State ->', 0],
      ]);
    });

    it('should set target state to Off when update requested for unsupported value', () => {
      service.updateTargetState(1 as CoolerStateType);

      const actual = service.service.getCharacteristic(HapCharacteristic.TargetHeatingCoolingState).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).toHaveBeenCalledWith('MOCK Target State ->', 1);
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

  describe('onTargetTemperatureSet', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.TargetTemperature);
    });

    it('should revert changing of Current Temperature when it is failed', () => {
      characteristic.setValue(-3);
      logMock.debug.mockReset();
      const processOnSetTargetTemperatureMock = jest.fn();
      service.processOnSetTargetTemperature = processOnSetTargetTemperatureMock;

      characteristic.setValue(1);
      const revertFunc = processOnSetTargetTemperatureMock.mock.calls[0][1];
      revertFunc();

      const actual = characteristic.value;

      expect(actual).toEqual(-3);
      expect(logMock.debug.mock.calls).toEqual([['MOCK Target Temperature ->', -3]]);
    });
  });

  describe('onTargetStateSet', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.TargetHeatingCoolingState);
    });

    it('should revert changing of Target State when it is failed', () => {
      characteristic.setValue(CoolerStateType.Cool);
      logMock.debug.mockReset();
      const processOnSetTargetStateMock = jest.fn();
      service.processOnSetTargetState = processOnSetTargetStateMock;

      characteristic.setValue(CoolerStateType.Off);
      const revertFunc = processOnSetTargetStateMock.mock.calls[0][1];
      revertFunc();

      const actual = characteristic.value;

      expect(actual).toEqual(2);
      expect(logMock.debug.mock.calls).toEqual([['MOCK Target State ->', 2]]);
    });
  });

  describe('onTemperatureDisplayUnitsSet', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.TemperatureDisplayUnits);
    });

    it('should revert changing of Current Temperature when it is failed', () => {
      characteristic.setValue(TemperatureDisplayUnitsType.Fahrenheit);
      logMock.debug.mockReset();
      const processOnSetTemperatureDisplayUnitsMock = jest.fn();
      service.processOnSetTemperatureDisplayUnits = processOnSetTemperatureDisplayUnitsMock;

      characteristic.setValue(TemperatureDisplayUnitsType.Celsius);
      const revertFunc = processOnSetTemperatureDisplayUnitsMock.mock.calls[0][1];
      revertFunc();

      const actual = characteristic.value;

      expect(actual).toEqual(1);
      expect(logMock.debug.mock.calls).toEqual([['MOCK Temperature Display Units ->', 1]]);
    });
  });
});
