import {
  InputConsumptionWattFactory,
  OutputConsumptionWattFactory,
} from '@ecoflow/characteristics/customCharacteristic';
import { Formats, HAP, Perms, Units } from 'homebridge';

describe('customCharacteristic', () => {
  let hapMock: HAP;
  const characteristicMock = jest.fn();
  const getDefaultValueMock = jest.fn();

  beforeEach(() => {
    characteristicMock.prototype.getDefaultValue = getDefaultValueMock;
    hapMock = {
      Characteristic: characteristicMock,
    } as unknown as HAP;
  });

  describe('InputConsumptionWattFactory', () => {
    it('should initialize UUID of characteristic', () => {
      const actual = InputConsumptionWattFactory(hapMock);

      expect(actual.UUID).toEqual('13172B0A-D346-4730-9732-32EF5B6EF8B7');
    });

    it('should use proper default value during initialization of characteristic', () => {
      getDefaultValueMock.mockReturnValue('123');

      const characteristic = InputConsumptionWattFactory(hapMock);
      const actual = new characteristic();

      expect(actual.value).toEqual('123');
    });

    it('should create characteristic with correct properties', () => {
      const characteristic = InputConsumptionWattFactory(hapMock);
      new characteristic();

      expect(characteristicMock).toHaveBeenCalledWith('Input Consumption', '13172B0A-D346-4730-9732-32EF5B6EF8B7', {
        description: 'Input Consumption, W',
        format: Formats.FLOAT,
        perms: [Perms.NOTIFY, Perms.PAIRED_READ],
        minValue: 0,
        minStep: 1,
        unit: Units.CELSIUS,
      });
    });
  });

  describe('OutputConsumptionWattFactory', () => {
    it('should initialize UUID of characteristic', () => {
      const actual = OutputConsumptionWattFactory(hapMock);

      expect(actual.UUID).toEqual('E863F10D-079E-48FF-8F27-9C2605A29F52');
    });

    it('should use proper default value during initialization of characteristic', () => {
      getDefaultValueMock.mockReturnValue(123);

      const characteristic = OutputConsumptionWattFactory(hapMock);
      const actual = new characteristic();

      expect(actual.value).toEqual(123);
    });

    it('should create characteristic with correct properties', () => {
      const characteristic = OutputConsumptionWattFactory(hapMock);
      new characteristic();

      expect(characteristicMock).toHaveBeenCalledWith('Output Consumption', 'E863F10D-079E-48FF-8F27-9C2605A29F52', {
        description: 'Output Consumption, W',
        format: Formats.FLOAT,
        perms: [Perms.NOTIFY, Perms.PAIRED_READ],
        minValue: 0,
        minStep: 1,
        unit: Units.CELSIUS,
      });
    });
  });
});
