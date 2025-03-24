import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { AdditionalOutletCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

class MockOutletService extends OutletServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, additionalCharacteristics?: CharacteristicType[]) {
    super(ecoFlowAccessory, additionalCharacteristics, 'MOCK');
  }

  public override async setOn(): Promise<void> {}
}

describe('OutletServiceBase', () => {
  let service: MockOutletService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryBase>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
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
        {
          UUID: CustomCharacteristics.PowerConsumption.OutputConsumptionKilowattHour.UUID,
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
        {
          UUID: CustomCharacteristics.PowerConsumption.OutputConsumptionKilowattHour.UUID,
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

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.OutputConsumptionWatts
      ).value;

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

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.OutputConsumptionWatts
      ).value;

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
      expect(logMock.debug.mock.calls).toEqual([
        ['MOCK Output Voltage, V ->', 41.1],
        ['MOCK Output Consumption, kW/h ->', 0],
      ]);
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

      service.updateOutputCurrent(24.5);

      const actual = service.service.getCharacteristic(CustomCharacteristics.PowerConsumption.OutputCurrent).value;

      expect(actual).toEqual(24.5);
      expect(logMock.debug.mock.calls).toEqual([
        ['MOCK Output Current, A ->', 24.5],
        ['MOCK Output Consumption, kW/h ->', 0],
      ]);
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
});
