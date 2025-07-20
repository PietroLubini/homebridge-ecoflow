import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { WaveAllQuotaData, WaveMainModeType, WavePowerModeType } from '@ecoflow/accessories/wave/interfaces/waveHttpApiContracts';
import { WaveMqttSetModuleType, WaveMqttSetOperateType } from '@ecoflow/accessories/wave/interfaces/waveMqttApiContracts';
import { ThermostatAirConditionerService } from '@ecoflow/accessories/wave/services/thermostatAirConditionerService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { TargetHeatingCoolingStateType, TemperatureDisplayUnitsType } from '@ecoflow/characteristics/characteristicContracts';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { sleep } from '@ecoflow/helpers/tests/sleep';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

describe('ThermostatAirConditionerService', () => {
  let service: ThermostatAirConditionerService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<WaveAllQuotaData>>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let hapService: HapService;

  const hapMock = {
    Characteristic: HapCharacteristic,
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
        serialNumber: 'sn1',
      },
      httpApiManager: httpApiManagerMock,
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<WaveAllQuotaData>>;
    service = new ThermostatAirConditionerService(ecoFlowAccessoryMock);
    hapService = new HapService('Accessory Middle Zone Name', HapService.Switch.UUID);
  });

  describe('processOnSetTargetState', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getService.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.TargetHeatingCoolingState);
    });

    it('should send Set command of PowerMode operateType to device when value is updated to Off', () => {
      characteristic.setValue(TargetHeatingCoolingStateType.Off);

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

    it('should send Set commands of PowerMode and MainMode operateType to device when value is updated to Cool', async () => {
      characteristic.setValue(TargetHeatingCoolingStateType.Cool);
      await sleep(500);

      expect(ecoFlowAccessoryMock.sendSetCommand.mock.calls).toEqual([
        [
          {
            id: 0,
            version: '',
            moduleType: WaveMqttSetModuleType.Default,
            operateType: WaveMqttSetOperateType.PowerMode,
            params: {
              powerMode: WavePowerModeType.On,
            },
          },
          expect.any(Function),
        ],
        [
          {
            id: 0,
            version: '',
            moduleType: WaveMqttSetModuleType.Default,
            operateType: WaveMqttSetOperateType.MainMode,
            params: {
              mainMode: WaveMainModeType.Cool,
            },
          },
          expect.any(Function),
        ],
      ]);
    });

    it('should send Set commands of PowerMode and MainMode operateType to device when value is updated to Heat', async () => {
      characteristic.setValue(TargetHeatingCoolingStateType.Heat);
      await sleep(500);

      expect(ecoFlowAccessoryMock.sendSetCommand.mock.calls).toEqual([
        [
          {
            id: 0,
            version: '',
            moduleType: WaveMqttSetModuleType.Default,
            operateType: WaveMqttSetOperateType.PowerMode,
            params: {
              powerMode: WavePowerModeType.On,
            },
          },
          expect.any(Function),
        ],
        [
          {
            id: 0,
            version: '',
            moduleType: WaveMqttSetModuleType.Default,
            operateType: WaveMqttSetOperateType.MainMode,
            params: {
              mainMode: WaveMainModeType.Heat,
            },
          },
          expect.any(Function),
        ],
      ]);
    });

    it('should send Set commands of PowerMode and MainMode operateType to device when value is updated to Auto', async () => {
      characteristic.setValue(TargetHeatingCoolingStateType.Auto);
      await sleep(500);

      expect(ecoFlowAccessoryMock.sendSetCommand.mock.calls).toEqual([
        [
          {
            id: 0,
            version: '',
            moduleType: WaveMqttSetModuleType.Default,
            operateType: WaveMqttSetOperateType.PowerMode,
            params: {
              powerMode: WavePowerModeType.On,
            },
          },
          expect.any(Function),
        ],
        [
          {
            id: 0,
            version: '',
            moduleType: WaveMqttSetModuleType.Default,
            operateType: WaveMqttSetOperateType.MainMode,
            params: {
              mainMode: WaveMainModeType.Fan,
            },
          },
          expect.any(Function),
        ],
      ]);
    });

    it('should revert changing of TargetState when sending Set command to device is failed', () => {
      characteristic.setValue(TargetHeatingCoolingStateType.Heat);
      ecoFlowAccessoryMock.sendSetCommand.mockReset();

      characteristic.setValue(TargetHeatingCoolingStateType.Cool);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toEqual(TargetHeatingCoolingStateType.Heat);
      expect(logMock.debug.mock.calls).toEqual([['Target State ->', 1]]);
    });
  });

  describe('processOnSetTemperatureDisplayUnits', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getService.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.TemperatureDisplayUnits);
    });

    it('should send Set command of TemperatureUnit operateType to device when value is updated to Fahrenheit', () => {
      characteristic.setValue(TemperatureDisplayUnitsType.Fahrenheit);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: WaveMqttSetModuleType.Default,
          operateType: WaveMqttSetOperateType.TemperatureUnit,
          params: {
            mode: TemperatureDisplayUnitsType.Fahrenheit,
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
          moduleType: WaveMqttSetModuleType.Default,
          operateType: WaveMqttSetOperateType.TemperatureUnit,
          params: {
            mode: TemperatureDisplayUnitsType.Celsius,
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
      expect(logMock.debug.mock.calls).toEqual([['Temperature Display Units ->', TemperatureDisplayUnitsType.Fahrenheit]]);
    });
  });

  describe('processOnSetTargetTemperature', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getService.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.TargetTemperature);
    });

    it('should send Set command of Temperature operateType to device when value is updated', () => {
      characteristic.setValue(17);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: WaveMqttSetModuleType.Default,
          operateType: WaveMqttSetOperateType.SetTemperature,
          params: {
            setTemp: 17,
          },
        },
        expect.any(Function)
      );
    });

    it('should revert changing of Temperature when sending Set command to device is failed', () => {
      characteristic.setValue(18);
      ecoFlowAccessoryMock.sendSetCommand.mockReset();

      characteristic.setValue(20);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toEqual(18);
      expect(logMock.debug.mock.calls).toEqual([['Target Temperature ->', 18]]);
    });
  });
});
