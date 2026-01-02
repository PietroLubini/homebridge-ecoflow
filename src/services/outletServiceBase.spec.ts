import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { AdditionalOutletCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { sleep } from '@ecoflow/helpers/tests/sleep';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';
import {
  CharacteristicGetHandler,
  CharacteristicSetHandler,
  Characteristic as HapCharacteristic,
  Service as HapService,
  HAPStatus,
  HapStatusError,
} from 'hap-nodejs';
import { API, Characteristic, Logging, PlatformAccessory } from 'homebridge';

enum HAPStatusMock {}

class MockOutletService extends OutletServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, additionalCharacteristics?: CharacteristicType[]) {
    super(ecoFlowAccessory, additionalCharacteristics, 'MOCK');
  }

  public override async processOnSetOn(): Promise<void> {}
}

describe('OutletServiceBase', () => {
  let service: MockOutletService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryBase>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let hapService: HapService;

  const apiMock = {
    hap: {
      Characteristic: HapCharacteristic,
      HapStatusError: HapStatusError,
      HAPStatus: HAPStatusMock,
    },
  } as unknown as API;
  EcoFlowHomebridgePlatform.InitCharacteristics(apiMock);

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
    } as unknown as jest.Mocked<EcoFlowAccessoryBase>;
    service = new MockOutletService(ecoFlowAccessoryMock);
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
      service = new MockOutletService(ecoFlowAccessoryMock, [CharacteristicType.OutputConsumptionInWatts]);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expected);
    });

    it('should add OutputVoltage characteristic when it is enabled in configuration', () => {
      const expected = [
        ...expectedMandatoryCharacteristics,
        {
          UUID: CustomCharacteristics.PowerConsumption.OutputVoltage.UUID,
          value: 0,
        },
      ];
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);
      service = new MockOutletService(ecoFlowAccessoryMock, [CharacteristicType.OutputVoltage]);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expected);
    });

    it('should add OutputCurrent characteristic when it is enabled in configuration', () => {
      const expected = [
        ...expectedMandatoryCharacteristics,
        {
          UUID: CustomCharacteristics.PowerConsumption.OutputCurrent.UUID,
          value: 0,
        },
      ];
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);
      service = new MockOutletService(ecoFlowAccessoryMock, [CharacteristicType.OutputCurrent]);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expected);
    });
  });

  describe('cleanupCharacteristics', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should remove non registered characteristics when cleanup characteristics is called', () => {
      service.service.addCharacteristic(CustomCharacteristics.PowerConsumption.OutputConsumptionWatts);
      service.service.addCharacteristic(HapCharacteristic.Identifier);
      service.cleanupCharacteristics();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expectedMandatoryCharacteristics);
      expect(logMock.warn.mock.calls).toEqual([
        ['[Accessory Outlet Name] Removing obsolete characteristic:', 'Output Consumption'],
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
      expect(logMock.debug).toHaveBeenCalledWith('MOCK State ->', true);
    });

    it('should set On state to false when it is requested', () => {
      service.updateState(false);

      const actual = service.service.getCharacteristic(HapCharacteristic.On).value;

      expect(actual).toBeFalsy();
      expect(logMock.debug).toHaveBeenCalledWith('MOCK State ->', false);
    });
  });

  describe('updateOutputConsumption', () => {
    it('should set OutputConsumption when it is enabled in configuration', () => {
      service = new MockOutletService(ecoFlowAccessoryMock, [CharacteristicType.OutputConsumptionInWatts]);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputConsumption(34.6);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.OutputConsumptionWatts).value;

      expect(actual).toEqual(35);
      expect(logMock.debug.mock.calls).toEqual([
        ['MOCK InUse ->', true],
        ['MOCK Output Consumption, W ->', 34.6],
      ]);
    });

    it('should not set OutputConsumption when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputConsumption(34.6);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.OutputConsumptionWatts).value;

      expect(actual).toEqual(0);
      expect(logMock.debug.mock.calls).toEqual([['MOCK InUse ->', true]]);
    });

    it('should set OutletInUse to true when OutputConsumption more than 0', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputConsumption(34.6);

      const actual = service.service.getCharacteristic(HapCharacteristic.OutletInUse).value;

      expect(actual).toBeTruthy();
      expect(logMock.debug.mock.calls).toEqual([['MOCK InUse ->', true]]);
    });

    it('should set OutletInUse to false when OutputConsumption is 0', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputConsumption(0);

      const actual = service.service.getCharacteristic(HapCharacteristic.OutletInUse).value;

      expect(actual).toBeFalsy();
      expect(logMock.debug.mock.calls).toEqual([['MOCK InUse ->', false]]);
    });
  });

  describe('updateOutputVoltage', () => {
    it('should set OutputVoltage when it is enabled in configuration', () => {
      service = new MockOutletService(ecoFlowAccessoryMock, [CharacteristicType.OutputVoltage]);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputVoltage(41.1);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.OutputVoltage).value;

      expect(actual).toEqual(41.1);
      expect(logMock.debug.mock.calls).toEqual([['MOCK Output Voltage, V ->', 41.1]]);
    });

    it('should not set OutputVoltage when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputVoltage(41.1);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.OutputVoltage).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).not.toHaveBeenCalled();
    });
  });

  describe('updateOutputCurrent', () => {
    it('should set OutputCurrent when it is enabled in configuration', () => {
      service = new MockOutletService(ecoFlowAccessoryMock, [CharacteristicType.OutputCurrent]);
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputCurrent(1.5);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.OutputCurrent).value;

      expect(actual).toEqual(1.5);
      expect(logMock.debug.mock.calls).toEqual([['MOCK Output Current, A ->', 1.5]]);
    });

    it('should not set OutputCurrent when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputCurrent(24.5);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.OutputCurrent).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).not.toHaveBeenCalled();
    });
  });

  describe('characteristics', () => {
    function createCharacteristicMock(): jest.Mocked<Characteristic> {
      return {
        setPropsPerms: jest.fn(),
        onGet: jest.fn(),
        onSet: jest.fn(),
        updateValue: jest.fn(),
      } as unknown as jest.Mocked<Characteristic>;
    }

    function setupCharacteristicMock(characteristicMock: jest.Mocked<Characteristic>): void {
      characteristicMock.setPropsPerms.mockReset();
      characteristicMock.onGet.mockReset();
      characteristicMock.onSet.mockReset();
      characteristicMock.setPropsPerms.mockReturnValueOnce(characteristicMock);
      characteristicMock.onGet.mockReturnValueOnce(characteristicMock);
      characteristicMock.onSet.mockReturnValueOnce(characteristicMock);
    }

    const characteristicOnMock: jest.Mocked<Characteristic> = createCharacteristicMock();
    const hapServiceMock: jest.Mocked<HapService> = {
      getCharacteristic: jest.fn(constructor => {
        switch (constructor.name) {
          case HapCharacteristic.On.name:
            return characteristicOnMock;
          default:
            return undefined;
        }
      }),
      setCharacteristic: jest.fn(),
    } as unknown as jest.Mocked<HapService>;

    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapServiceMock);
      setupCharacteristicMock(characteristicOnMock);
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

        it('should revert changing of On state when it is failed with error', async () => {
          accessoryMock.getServiceById.mockReturnValueOnce(hapService);
          service.initialize();
          const characteristic = service.service.getCharacteristic(HapCharacteristic.On);
          characteristic.setValue(true);
          logMock.debug.mockReset();
          const processOnSetMock = jest.fn();
          service.processOnSetOn = processOnSetMock;
          const error = new Error('Failed to set On');
          processOnSetMock.mockImplementationOnce(() => {
            throw error;
          });

          characteristic.setValue(false);
          await sleep(500);

          const actual = characteristic.value;

          expect(actual).toBeTruthy();
          expect(logMock.debug.mock.calls).toEqual([['MOCK State ->', true]]);
          expect(logMock.warn.mock.calls).toEqual([['Failed to process onSet. Reverting value...', error]]);
        });
      });
    });
  });
});
