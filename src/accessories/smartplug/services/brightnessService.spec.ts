import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { SmartPlugAllQuotaData } from '@ecoflow/accessories/smartplug/interfaces/smartPlugHttpApiContracts';
import { SmartPlugMqttSetCmdCodeType } from '@ecoflow/accessories/smartplug/interfaces/smartPlugMqttApiContracts';
import { BrightnessService } from '@ecoflow/accessories/smartplug/services/brightnessService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

describe('BrightnessService', () => {
  let service: BrightnessService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<SmartPlugAllQuotaData>>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let hapService: HapService;

  const hapMock = {
    Characteristic: HapCharacteristic,
  } as unknown as HAP;
  EcoFlowHomebridgePlatform.InitCustomCharacteristics(hapMock);

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
      },
      httpApiManager: httpApiManagerMock,
      quota: {},
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<SmartPlugAllQuotaData>>;
    service = new BrightnessService(ecoFlowAccessoryMock, 1023);
    hapService = new HapService('Accessory Bulb Name', HapService.Lightbulb.UUID);
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
      expect(logMock.debug).toHaveBeenCalledWith('Brightness State ->', true);
    });
  });

  describe('updateBrightness', () => {
    let characteristic: Characteristic;

    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.Brightness);
    });

    it('should set 100% brightness when maximum value is set', () => {
      service.updateBrightness(1023);

      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug).toHaveBeenCalledWith('Brightness Brightness ->', 100);
    });

    it('should set 0% brightness when minimum value is set', () => {
      service.updateBrightness(0);

      const actual = characteristic.value;

      expect(actual).toEqual(0);
      expect(logMock.debug).toHaveBeenCalledWith('Brightness Brightness ->', 0);
    });

    it('should set brightness when it is requested', () => {
      service.updateBrightness(468.0225);

      const actual = characteristic.value;

      expect(actual).toEqual(46);
      expect(logMock.debug).toHaveBeenCalledWith('Brightness Brightness ->', 45.75);
    });

    it('should revert changing of Brightness to value set from UI when sending Set command to device is failed', () => {
      service.updateBrightness(1023);
      logMock.debug.mockReset();

      characteristic.setValue(20);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug.mock.calls).toEqual([['Brightness Brightness ->', 100]]);
    });
  });

  describe('processOnSetOn', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.On);
    });

    it('should send Set command with max brightness value to device when On value was changed to true', () => {
      characteristic.setValue(true);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          cmdCode: SmartPlugMqttSetCmdCodeType.Brightness,
          params: {
            brightness: 1023,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command with min brightness value to device when On value was changed to false', () => {
      characteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          cmdCode: SmartPlugMqttSetCmdCodeType.Brightness,
          params: {
            brightness: 0,
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
      expect(logMock.debug.mock.calls).toEqual([['Brightness Brightness ->', 0]]);
    });
  });

  describe('onBrightnessSet', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.Brightness);
    });

    it('should send Set command to device when Brightness value was changed', () => {
      characteristic.setValue(30);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          cmdCode: SmartPlugMqttSetCmdCodeType.Brightness,
          params: {
            brightness: 307,
          },
        },
        expect.any(Function)
      );
    });

    it('should revert changing of Brightness when sending Set command to device is failed', () => {
      characteristic.setValue(100);
      ecoFlowAccessoryMock.sendSetCommand.mockReset();
      logMock.debug.mockReset();

      characteristic.setValue(20);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug.mock.calls).toEqual([['Brightness Brightness ->', 100]]);
    });
  });
});
