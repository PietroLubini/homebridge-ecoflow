import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { PowerStreamAllQuotaData } from '@ecoflow/accessories/powerstream/interfaces/powerStreamHttpApiContracts';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { TemperatureSensorService } from '@ecoflow/services/temperatureSensorService';
import {
  CharacteristicGetHandler,
  Characteristic as HapCharacteristic,
  Service as HapService,
  HapStatusError,
} from 'hap-nodejs';
import { Characteristic, HAP, HAPStatus, Logging, PlatformAccessory } from 'homebridge';

enum HAPStatusMock {
  READ_ONLY_CHARACTERISTIC = -70404,
}

describe('TemperatureSensorService', () => {
  let service: TemperatureSensorService;
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
      value: 'Accessory Temperature Sensor Name',
    },
    {
      UUID: HapCharacteristic.CurrentTemperature.UUID,
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
      getService: jest.fn(),
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
    service = new TemperatureSensorService(ecoFlowAccessoryMock);
    hapService = new HapService('Accessory Temperature Sensor Name', HapService.TemperatureSensor.UUID);
  });

  describe('initialize', () => {
    it('should add TemperatureSensor service when it is not added to accessory yet', () => {
      const expected = hapService;
      accessoryMock.getService.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.addService).toHaveBeenCalledWith(
        HapService.TemperatureSensor,
        'accessory1',
        HapService.TemperatureSensor.UUID
      );
    });

    it('should use existing TemperatureSensor service when it is already added to accessory', () => {
      const expected = hapService;
      accessoryMock.getService.mockReturnValueOnce(expected);

      service.initialize();
      const actual = service.service;

      expect(actual).toEqual(expected);
      expect(accessoryMock.getService).toHaveBeenCalledWith(HapService.TemperatureSensor);
      expect(accessoryMock.addService).not.toHaveBeenCalled();
    });

    it('should add TemperatureSensor characteristics when initializing accessory', () => {
      accessoryMock.getService.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expectedMandatoryCharacteristics);
    });
  });

  describe('updateCurrentTemperature', () => {
    let characteristic: Characteristic;

    beforeEach(() => {
      accessoryMock.getService.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.CurrentTemperature);
    });

    it('should set current temperature when it is requested', () => {
      service.updateCurrentTemperature(1.5);

      const actual = characteristic.value;

      expect(actual).toEqual(1.5);
      expect(logMock.debug).toHaveBeenCalledWith('Current Temperature ->', 1.5);
    });
  });

  describe('characteristics', () => {
    const characteristicCurrentTemperatureMock: jest.Mocked<Characteristic> = {
      onGet: jest.fn(),
      onSet: jest.fn(),
      updateValue: jest.fn(),
    } as unknown as jest.Mocked<Characteristic>;
    const hapServiceMock: jest.Mocked<HapService> = {
      getCharacteristic: jest.fn(constructor => {
        if (constructor.name === 'CurrentTemperature') {
          return characteristicCurrentTemperatureMock;
        }
        return undefined;
      }),
    } as unknown as jest.Mocked<HapService>;

    beforeEach(() => {
      accessoryMock.getService.mockReturnValueOnce(hapServiceMock);
      characteristicCurrentTemperatureMock.onGet.mockReset();
      characteristicCurrentTemperatureMock.onGet.mockReturnValueOnce(characteristicCurrentTemperatureMock);
      service.initialize();
    });

    describe('currentTemperature', () => {
      describe('onGet', () => {
        let handler: CharacteristicGetHandler;

        beforeEach(() => {
          handler = characteristicCurrentTemperatureMock.onGet.mock.calls[0][0];
        });
        it('should get current temperature when device is online', () => {
          service.updateCurrentTemperature(1.5);

          const actual = handler(undefined);

          expect(actual).toEqual(1.5);
        });

        it('should throw an error when getting current temperature but device is offline', () => {
          service.updateReachability(false);

          expect(() => handler(undefined)).toThrow(new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        });
      });
    });
  });
});
