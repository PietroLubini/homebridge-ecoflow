import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic } from 'hap-nodejs';

describe('BatteryStatusProvider', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let provider: BatteryStatusProvider;

  beforeEach(() => {
    platformMock = {
      Characteristic: HapCharacteristic,
    } as unknown as jest.Mocked<EcoFlowHomebridgePlatform>;
    provider = new BatteryStatusProvider();
  });

  describe('getStatusLowBattery', () => {
    it('should return normal battery status when current battery level is not lower discharging limit plus 5% buffer', () => {
      const actual = provider.getStatusLowBattery(platformMock.Characteristic, 25, 20);

      expect(actual).toEqual(platformMock.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
    });

    it('should return low battery status when current battery level is lower discharging limit plus 5% buffer', () => {
      const actual = provider.getStatusLowBattery(platformMock.Characteristic, 24.9, 20);

      expect(actual).toEqual(platformMock.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
    });
  });
});
