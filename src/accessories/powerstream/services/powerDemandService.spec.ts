import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { PowerStreamAllQuotaData } from '@ecoflow/accessories/powerstream/interfaces/powerStreamHttpApiContracts';
import { PowerStreamMqttSetCmdCodeType } from '@ecoflow/accessories/powerstream/interfaces/powerStreamMqttApiContracts';
import { PowerDemandService } from '@ecoflow/accessories/powerstream/services/powerDemandService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService, HapStatusError } from 'hap-nodejs';
import { Characteristic, HAP, Logging, PlatformAccessory } from 'homebridge';

enum HAPStatus {
  READ_ONLY_CHARACTERISTIC = -70404,
}

describe('PowerDemandService', () => {
  let service: PowerDemandService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<PowerStreamAllQuotaData>>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let hapService: HapService;

  const hapMock = {
    Characteristic: HapCharacteristic,
    HapStatusError: HapStatusError,
    HAPStatus: HAPStatus,
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
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<PowerStreamAllQuotaData>>;
    service = new PowerDemandService(ecoFlowAccessoryMock, 8000);
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
      expect(logMock.debug).toHaveBeenCalledWith('Power Demand State ->', true);
    });
  });

  describe('updatePowerDemand', () => {
    let characteristic: Characteristic;

    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.RotationSpeed);
    });

    it('should set 100% power demand when maximum value is set', () => {
      service.updateRotationSpeed(8000);

      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug).toHaveBeenCalledWith('Power Demand RotationSpeed ->', 100);
    });

    it('should set 0% power demand when minimum value is set', () => {
      service.updateRotationSpeed(0);

      const actual = characteristic.value;

      expect(actual).toEqual(0);
      expect(logMock.debug).toHaveBeenCalledWith('Power Demand RotationSpeed ->', 0);
    });

    it('should set power demand when it is requested', () => {
      service.updateRotationSpeed(2500);

      const actual = characteristic.value;

      expect(actual).toEqual(31);
      expect(logMock.debug).toHaveBeenCalledWith('Power Demand RotationSpeed ->', 31.25);
    });

    it('should revert changing of power demand to value set from UI when sending Set command to device is failed', () => {
      service.updateRotationSpeed(8000);
      logMock.debug.mockReset();

      characteristic.setValue(20);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug.mock.calls).toEqual([['Power Demand RotationSpeed ->', 100]]);
    });
  });

  describe('onOnSet', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.On);
    });

    it('should send Set command with max demand value to device when On value was changed to true', () => {
      characteristic.setValue(true);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          cmdCode: PowerStreamMqttSetCmdCodeType.WN511_SET_PERMANENT_WATTS_PACK,
          params: {
            permanentWatts: 8000,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command with min demand value to device when On value was changed to false', () => {
      characteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          cmdCode: PowerStreamMqttSetCmdCodeType.WN511_SET_PERMANENT_WATTS_PACK,
          params: {
            permanentWatts: 0,
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
      expect(logMock.debug.mock.calls).toEqual([['Power Demand RotationSpeed ->', 0]]);
    });
  });
  });

  describe('onPowerDemandSet', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.RotationSpeed);
    });

    it('should send Set command to device when Power Demand value was changed', () => {
      characteristic.setValue(30);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          cmdCode: PowerStreamMqttSetCmdCodeType.WN511_SET_PERMANENT_WATTS_PACK,
          params: {
            permanentWatts: 2400,
          },
        },
        expect.any(Function)
      );
    });

    it('should revert changing of Power Demand when sending Set command to device is failed', () => {
      characteristic.setValue(100);
      ecoFlowAccessoryMock.sendSetCommand.mockReset();
      logMock.debug.mockReset();

      characteristic.setValue(20);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toEqual(100);
      expect(logMock.debug.mock.calls).toEqual([['Power Demand RotationSpeed ->', 100]]);
    });
  });
});
