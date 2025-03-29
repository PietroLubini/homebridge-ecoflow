import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { getActualCharacteristics, MockCharacteristic } from '@ecoflow/helpers/tests/serviceTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { ContactSensorService } from '@ecoflow/services/contactSensorService';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Logging, PlatformAccessory } from 'homebridge';

describe('ContactSensorService', () => {
  let service: ContactSensorService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryBase>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let hapService: HapService;

  const expectedCharacteristics: MockCharacteristic[] = [
    {
      UUID: HapCharacteristic.Name.UUID,
      value: 'Accessory ContactSensor Name',
    },
    {
      UUID: HapCharacteristic.ContactSensorState.UUID,
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
      Characteristic: HapCharacteristic,
    } as unknown as jest.Mocked<EcoFlowHomebridgePlatform>;
    accessoryMock = {
      getServiceById: jest.fn(),
      addService: jest.fn(),
    } as unknown as jest.Mocked<PlatformAccessory>;
    ecoFlowAccessoryMock = {
      log: logMock,
      platform: platformMock,
      accessory: accessoryMock,
      config: {},
    } as unknown as jest.Mocked<EcoFlowAccessoryBase>;
    service = new ContactSensorService(ecoFlowAccessoryMock, 'Door');
    hapService = new HapService('Accessory ContactSensor Name', HapService.ContactSensor.UUID);
  });

  describe('initialize', () => {
    it('should add ContactSensor characteristics when initializing accessory', () => {
      accessoryMock.getServiceById.mockReturnValueOnce(undefined);
      accessoryMock.addService.mockReturnValueOnce(hapService);

      service.initialize();
      const actual = getActualCharacteristics(service.service);

      expect(actual).toEqual(expectedCharacteristics);
    });
  });

  describe('updateState', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should set ContactSensor to CONTACT_DETECTED when update state with closed = true', () => {
      service.updateState(true);
      const actual = service.service.getCharacteristic(HapCharacteristic.ContactSensorState).value;

      expect(actual).toEqual(HapCharacteristic.ContactSensorState.CONTACT_DETECTED);
      expect(logMock.debug).toHaveBeenCalledWith('Door State ->', 0);
    });

    it('should set ContactSensor to CONTACT_NOT_DETECTED when update state with closed = false', () => {
      service.updateState(false);
      const actual = service.service.getCharacteristic(HapCharacteristic.ContactSensorState).value;

      expect(actual).toEqual(HapCharacteristic.ContactSensorState.CONTACT_NOT_DETECTED);
      expect(logMock.debug).toHaveBeenCalledWith('Door State ->', 1);
    });
  });
});
