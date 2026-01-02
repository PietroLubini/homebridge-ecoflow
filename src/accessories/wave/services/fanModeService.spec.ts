import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { WaveAllQuotaData, WaveFanSpeedType, WaveMainModeType, WavePowerModeType } from '@ecoflow/accessories/wave/interfaces/waveHttpApiContracts';
import { WaveMqttSetModuleType, WaveMqttSetOperateType } from '@ecoflow/accessories/wave/interfaces/waveMqttApiContracts';
import { FanModeService } from '@ecoflow/accessories/wave/services/fanModeService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { API, Characteristic, Logging, PlatformAccessory } from 'homebridge';

describe('FanModeService', () => {
  let service: FanModeService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<WaveAllQuotaData>>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let hapService: HapService;

  const apiMock = {
    hap: {
      Characteristic: HapCharacteristic,
    },
  } as unknown as API;
  EcoFlowHomebridgePlatform.InitCharacteristics(apiMock);

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
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<WaveAllQuotaData>>;
    service = new FanModeService(ecoFlowAccessoryMock);
    hapService = new HapService('Accessory Fan Name', HapService.Lightbulb.UUID);
  });

  describe('setOn', () => {
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
    });

    it('should not allow to set value when it is updated from UI', () => {
      const onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
      onCharacteristic.value = false;

      onCharacteristic.setValue(true);
      const actual = onCharacteristic.value;

      expect(actual).toBeFalsy();
    });
  });

  describe('updateState', () => {
    let characteristic: Characteristic;

    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.On);
    });

    it('should set On state to true when it is requested', () => {
      service.updateState(true);

      const actual = characteristic.value;

      expect(actual).toBeTruthy();
      expect(logMock.debug).toHaveBeenCalledWith('Fan Mode State ->', true);
    });
  });

  describe('updatePositionedRotationSpeed', () => {
    let characteristic: Characteristic;

    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.RotationSpeed);
    });

    it('should set 100% rotation speed when Fan Mode is set to High', () => {
      service.updatePositionedRotationSpeed(WaveFanSpeedType.High);

      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug).toHaveBeenCalledWith('Fan Mode RotationSpeed ->', 100);
    });

    it('should set 67% rotation speed when Fan Mode is set to Medium', () => {
      service.updatePositionedRotationSpeed(WaveFanSpeedType.Medium);

      const actual = characteristic.value;

      expect(actual).toEqual(67);
      expect(logMock.debug).toHaveBeenCalledWith('Fan Mode RotationSpeed ->', 67);
    });

    it('should set 33% rotation speed when Fan Mode is set to Low', () => {
      service.updatePositionedRotationSpeed(WaveFanSpeedType.Low);

      const actual = characteristic.value;

      expect(actual).toEqual(33);
      expect(logMock.debug).toHaveBeenCalledWith('Fan Mode RotationSpeed ->', 33);
    });
  });

  describe('processOnSetOn', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.On);
    });

    it('should send Set command with main mode set to Fan to device when On value was changed to true', () => {
      characteristic.setValue(true);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: WaveMqttSetModuleType.Default,
          operateType: WaveMqttSetOperateType.MainMode,
          params: {
            mainMode: WaveMainModeType.Fan,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command with powerMode set to Off to device when On value was changed to false', () => {
      characteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: WaveMqttSetModuleType.Default,
          operateType: WaveMqttSetOperateType.PowerMode,
          params: {
            powerMode: WavePowerModeType.Off,
          },
        },
        expect.any(Function)
      );
    });

    it('should revert changing of On state when sending Set command to device is failed', () => {
      characteristic.updateValue(true);

      characteristic.setValue(false);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toBeTruthy();
      expect(logMock.debug.mock.calls).toEqual([['Fan Mode State ->', true]]);
    });
  });

  describe('processOnSetPositionedRotationSpeed', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.RotationSpeed);
    });

    it('should send Set command with fanValue set to Low to device when Fan Mode value was changed to 33', () => {
      characteristic.setValue(33);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: WaveMqttSetModuleType.Default,
          operateType: WaveMqttSetOperateType.FanSpeedMode,
          params: {
            fanValue: WaveFanSpeedType.Low,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command with fanValue set to Medium to device when Fan Mode value was changed to 67', () => {
      characteristic.setValue(67);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: WaveMqttSetModuleType.Default,
          operateType: WaveMqttSetOperateType.FanSpeedMode,
          params: {
            fanValue: WaveFanSpeedType.Medium,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command with fanValue set to High to device when Fan Mode value was changed to 100', () => {
      characteristic.setValue(100);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: WaveMqttSetModuleType.Default,
          operateType: WaveMqttSetOperateType.FanSpeedMode,
          params: {
            fanValue: WaveFanSpeedType.High,
          },
        },
        expect.any(Function)
      );
    });

    it('should revert changing of Fan Mode when sending Set command to device is failed', () => {
      characteristic.setValue(100);
      ecoFlowAccessoryMock.sendSetCommand.mockReset();
      logMock.debug.mockReset();

      characteristic.setValue(20);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug.mock.calls).toEqual([['Fan Mode RotationSpeed ->', 100]]);
    });
  });
});
