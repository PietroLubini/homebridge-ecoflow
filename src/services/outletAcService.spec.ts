import { BatteryAllQuotaData } from '@ecoflow/accessories/batteries/batteryAccessory';
import { EcoFlowAccessoryWithQuota } from '@ecoflow/accessories/ecoFlowAccessory';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { AdditionalBatteryCharacteristicType as CharacteristicType } from '@ecoflow/config';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { OutletAcService } from '@ecoflow/services/outletAcService';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

describe('OutletAcService', () => {
  let service: OutletAcService<BatteryAllQuotaData>;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuota<BatteryAllQuotaData>>;
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
      value: 'accessory1 AC',
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
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuota<BatteryAllQuotaData>>;
    service = new OutletAcService(ecoFlowAccessoryMock);
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
      expect(accessoryMock.addService).toHaveBeenCalledWith(HapService.Outlet, 'accessory1 AC', 'AC');
    });

    it('should use existing Outlet service when it is already added to accessory', () => {
      const expected = hapService;
      accessoryMock.getServiceById.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.getServiceById).toHaveBeenCalledWith(HapService.Outlet, 'AC');
      expect(accessoryMock.addService).not.toHaveBeenCalled();
    });

    it('should add Battery characteristics when initializing accessory without turned on custom characteristics', () => {
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
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [CharacteristicType.InputConsumptionInWatts],
      };

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expected);
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
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [CharacteristicType.OutputConsumptionInWatts],
      };

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
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [CharacteristicType.BatteryLevel],
      };

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
      expect(logMock.debug).toHaveBeenCalledWith('AC State ->', true);
    });

    it('should set On state to false when it is requested', () => {
      service.updateState(false);

      const actual = service.service.getCharacteristic(HapCharacteristic.On).value;

      expect(actual).toBeFalsy();
      expect(logMock.debug).toHaveBeenCalledWith('AC State ->', false);
    });
  });

  describe('updateOutputConsumption', () => {
    it('should set OutputConsumption when it is enabled in configuration', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [CharacteristicType.OutputConsumptionInWatts],
      };
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputConsumption(34.6);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.OutputConsumptionWatts
      ).value;

      expect(actual).toEqual(35);
      expect(logMock.debug.mock.calls).toEqual([
        ['AC InUse ->', true],
        ['AC Output Consumption, W ->', 34.6],
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
      expect(logMock.debug.mock.calls).toEqual([['AC InUse ->', true]]);
    });

    it('should set OutletInUse to true when OutputConsumption more than 0', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputConsumption(34.6);

      const actual = service.service.getCharacteristic(HapCharacteristic.OutletInUse).value;

      expect(actual).toBeTruthy();
      expect(logMock.debug.mock.calls).toEqual([['AC InUse ->', true]]);
    });

    it('should set OutletInUse to false when OutputConsumption is 0', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateOutputConsumption(0);

      const actual = service.service.getCharacteristic(HapCharacteristic.OutletInUse).value;

      expect(actual).toBeFalsy();
      expect(logMock.debug.mock.calls).toEqual([['AC InUse ->', false]]);
    });
  });

  describe('updateInputConsumption', () => {
    it('should set InputConsumption when it is enabled in configuration', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [CharacteristicType.InputConsumptionInWatts],
      };
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateInputConsumption(41.1);

      const actual = service.service.getCharacteristic(
        CustomCharacteristics.PowerConsumption.InputConsumptionWatts
      ).value;

      expect(actual).toEqual(41);
      expect(logMock.debug.mock.calls).toEqual([['AC Input Consumption, W ->', 41.1]]);
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

  describe('updateBatteryLevel', () => {
    it('should set BatteryLevel when it is enabled in configuration', () => {
      ecoFlowAccessoryMock.config.battery = {
        additionalCharacteristics: [CharacteristicType.BatteryLevel],
      };
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateBatteryLevel(87.4);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(87);
      expect(logMock.debug.mock.calls).toEqual([['AC Battery Level, % ->', 87.4]]);
    });

    it('should not set BatteryLevel when it is disabled in configuration', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();

      service.updateBatteryLevel(87.4);

      const actual = service.service.getCharacteristic(HapCharacteristic.BatteryLevel).value;

      expect(actual).toEqual(0);
      expect(logMock.debug).not.toHaveBeenCalled();
    });
  });

  describe('onSet', () => {
    let onCharacteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      ecoFlowAccessoryMock.quota.inv = {
        inputWatts: 0,
        cfgAcOutVol: 47.9,
        cfgAcOutFreq: 50,
        cfgAcXboost: false,
      };
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
    });

    it('should send Set command to device when On value was changed to true', () => {
      onCharacteristic.setValue(true);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        3,
        'acOutCfg',
        {
          out_voltage: 47.9,
          out_freq: 50,
          xboost: 0,
          enabled: 1,
        },
        expect.any(Function)
      );
    });

    it('should send Set command to device when On value was changed to false', () => {
      ecoFlowAccessoryMock.quota.inv.cfgAcXboost = true;

      onCharacteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        3,
        'acOutCfg',
        {
          out_voltage: 47.9,
          out_freq: 50,
          xboost: 1,
          enabled: 0,
        },
        expect.any(Function)
      );
    });

    it(`should send Set command to device with cfgAcOutVol set to 220000 when On value was changed and
      there is no cfgAcOutVol value in quota`, () => {
      ecoFlowAccessoryMock.quota.inv.cfgAcOutVol = undefined;

      onCharacteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        3,
        'acOutCfg',
        {
          out_voltage: 220000,
          out_freq: 50,
          xboost: 0,
          enabled: 0,
        },
        expect.any(Function)
      );
    });

    it(`should send Set command to device with cfgAcOutFreq set to 1 when On value was changed and
      there is no cfgAcOutFreq value in quota`, () => {
      ecoFlowAccessoryMock.quota.inv.cfgAcOutFreq = undefined;

      onCharacteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        3,
        'acOutCfg',
        {
          out_voltage: 47.9,
          out_freq: 1,
          xboost: 0,
          enabled: 0,
        },
        expect.any(Function)
      );
    });

    it('should send Set command to device with XBoost set to true when On value was changed and there is no XBoost value in quota', () => {
      ecoFlowAccessoryMock.quota.inv.cfgAcXboost = undefined;

      onCharacteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        3,
        'acOutCfg',
        {
          out_voltage: 47.9,
          out_freq: 50,
          xboost: 1,
          enabled: 0,
        },
        expect.any(Function)
      );
    });

    it('should revert changing of On state when sending Set command to device is failed', () => {
      onCharacteristic.updateValue(true);

      onCharacteristic.setValue(false);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][3];
      revertFunc();
      const actual = onCharacteristic.value;

      expect(actual).toBeTruthy();
      expect(logMock.debug.mock.calls).toEqual([['AC State ->', true]]);
    });
  });
});