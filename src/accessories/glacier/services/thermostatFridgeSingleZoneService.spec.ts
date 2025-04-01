import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { GlacierAllQuotaData, TemperatureType } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  GlacierMqttSetModuleType,
  GlacierMqttSetOperateType,
} from '@ecoflow/accessories/glacier/interfaces/glacierMqttApiContracts';
import { ThermostatFridgeSingleZoneService } from '@ecoflow/accessories/glacier/services/thermostatFridgeSingleZoneService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import {
  TargetHeatingCoolingStateType,
  TemperatureDisplayUnitsType,
} from '@ecoflow/characteristics/characteristicContracts';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService, HAPStatus, HapStatusError } from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

enum HAPStatusMock {
  READ_ONLY_CHARACTERISTIC = -70404,
}

describe('ThermostatFridgeSingleZoneService', () => {
  let service: ThermostatFridgeSingleZoneService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>>;
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
        serialNumber: 'sn1',
      },
      httpApiManager: httpApiManagerMock,
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>>;
    service = new ThermostatFridgeSingleZoneService(ecoFlowAccessoryMock);
    hapService = new HapService('Accessory Middle Zone Name', HapService.Switch.UUID);
  });

  describe('processOnSetTargetState', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.TargetHeatingCoolingState);
    });

    it('should not allow to set Target State value', () => {
      const actual = characteristic.setValue(TargetHeatingCoolingStateType.Cool);

      expect(actual.statusCode).toBe(HAPStatus.READ_ONLY_CHARACTERISTIC);
    });
  });

  describe('processOnSetTemperatureDisplayUnits', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.TemperatureDisplayUnits);
    });

    it('should send Set command of TemperatureUnit operateType to device when value is updated to Fahrenheit', () => {
      characteristic.setValue(TemperatureDisplayUnitsType.Fahrenheit);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: GlacierMqttSetModuleType.Default,
          operateType: GlacierMqttSetOperateType.TemperatureUnit,
          params: {
            unit: TemperatureType.Fahrenheit,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command of TemperatureUnit operateType to device when value is updated to Celsius', () => {
      characteristic.setValue(TemperatureDisplayUnitsType.Celsius);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: GlacierMqttSetModuleType.Default,
          operateType: GlacierMqttSetOperateType.TemperatureUnit,
          params: {
            unit: TemperatureType.Celsius,
          },
        },
        expect.any(Function)
      );
    });

    it('should revert changing of TemperatureUnit when sending Set command to device is failed', () => {
      characteristic.setValue(TemperatureDisplayUnitsType.Fahrenheit);
      ecoFlowAccessoryMock.sendSetCommand.mockReset();

      characteristic.setValue(TemperatureDisplayUnitsType.Celsius);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toEqual(TemperatureDisplayUnitsType.Fahrenheit);
      expect(logMock.debug.mock.calls).toEqual([
        ['Single Zone Temperature Display Units ->', TemperatureDisplayUnitsType.Fahrenheit],
      ]);
    });
  });

  describe('processOnSetTargetTemperature', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.TargetTemperature);
    });

    it('should send Set command of Temperature operateType to device when value is updated', () => {
      characteristic.setValue(2);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: GlacierMqttSetModuleType.Default,
          operateType: GlacierMqttSetOperateType.Temperature,
          params: {
            tmpM: 2,
          },
        },
        expect.any(Function)
      );
    });

    it('should revert changing of Temperature when sending Set command to device is failed', () => {
      characteristic.setValue(4);
      ecoFlowAccessoryMock.sendSetCommand.mockReset();

      characteristic.setValue(1.5);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toEqual(4);
      expect(logMock.debug.mock.calls).toEqual([['Single Zone Target Temperature ->', 4]]);
    });
  });
});
