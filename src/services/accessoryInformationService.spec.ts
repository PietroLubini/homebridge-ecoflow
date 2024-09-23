import { EcoFlowAccessory } from '@ecoflow/accessories/ecoFlowAccessory';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import fs from 'fs';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Logging, PlatformAccessory } from 'homebridge';

jest.mock('fs');

describe('AccessoryInformationService', () => {
  let service: AccessoryInformationService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessory>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let hapService: HapService;

  const expectedCharacteristics: MockCharacteristic[] = [
    {
      UUID: HapCharacteristic.Name.UUID,
      value: 'Information Service',
    },
    {
      UUID: HapCharacteristic.Manufacturer.UUID,
      value: 'EcoFlow',
    },
    {
      UUID: HapCharacteristic.Model.UUID,
      value: 'Delta 2 Max',
    },
    {
      UUID: HapCharacteristic.SerialNumber.UUID,
      value: 'R123ABCDEGHI321',
    },
    {
      UUID: HapCharacteristic.FirmwareRevision.UUID,
      value: '1.2.3',
    },
    {
      UUID: HapCharacteristic.Identify.UUID,
      value: false,
    },
  ];

  beforeEach(() => {
    logMock = {
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logging>;
    platformMock = {
      Service: HapService,
      Characteristic: HapCharacteristic,
    } as unknown as jest.Mocked<EcoFlowHomebridgePlatform>;
    accessoryMock = {
      getService: jest.fn(),
      addService: jest.fn(),
    } as unknown as jest.Mocked<PlatformAccessory>;
    ecoFlowAccessoryMock = {
      log: logMock,
      platform: platformMock,
      accessory: accessoryMock,
      config: {
        model: 'Delta 2 Max',
        serialNumber: 'R123ABCDEGHI321',
      },
    } as unknown as jest.Mocked<EcoFlowAccessory>;
    service = new AccessoryInformationService(ecoFlowAccessoryMock);
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce('{"version": "1.2.3"}');
    hapService = new HapService('Information Service', HapService.AccessoryInformation.UUID);
  });

  describe('initialize', () => {
    it('should throw error when trying to access non initialized service', () => {
      expect(() => service.service).toThrow('Service is not initialized: AccessoryInformationService');
      expect(logMock.error).toHaveBeenCalledWith('Service is not initialized:', 'AccessoryInformationService');
    });

    it('should add AccessoryInformation service when it is not added to accessory yet', () => {
      const expected = hapService;
      accessoryMock.getService.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.addService).toHaveBeenCalledWith(
        HapService.AccessoryInformation,
        'Information',
        HapService.AccessoryInformation.UUID
      );
    });

    it('should use existing AccessoryInformation service when it is already added to accessory', () => {
      const expected = hapService;
      accessoryMock.getService.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.addService).not.toHaveBeenCalled();
    });

    it('should add information characteristics when initializing accessory', () => {
      accessoryMock.getService.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expectedCharacteristics);
    });
  });

  describe('cleanupCharacteristics', () => {
    beforeEach(() => {
      accessoryMock.getService.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should remove non registered characteristics when cleanup characteristics is called', () => {
      service.service.addCharacteristic(HapCharacteristic.On);
      service.service.addCharacteristic(HapCharacteristic.InUse);
      service.cleanupCharacteristics();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expectedCharacteristics);
      expect(logMock.warn.mock.calls).toEqual([
        ['[Information] Removing obsolete characteristic:', 'On'],
        ['[Information] Removing obsolete characteristic:', 'In Use'],
      ]);
    });
  });
});
