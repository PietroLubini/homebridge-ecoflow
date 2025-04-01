import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { GlacierAllQuotaData } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  GlacierMqttSetModuleType,
  GlacierMqttSetOperateType,
} from '@ecoflow/accessories/glacier/interfaces/glacierMqttApiContracts';
import { SwitchDetachIceService } from '@ecoflow/accessories/glacier/services/switchDetachIceService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Characteristic, Logging, PlatformAccessory } from 'homebridge';

describe('SwitchDetachIceService', () => {
  let service: SwitchDetachIceService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>>;
  let logMock: jest.Mocked<Logging>;
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let hapService: HapService;

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
    service = new SwitchDetachIceService(ecoFlowAccessoryMock);
    hapService = new HapService('Accessory Detach Ice Name', HapService.Switch.UUID);
  });

  describe('processOnSetOn', () => {
    let characteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
    });

    it('should send Set command to device when Detach Ice value was changed to On', () => {
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.On);

      characteristic.setValue(true);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: GlacierMqttSetModuleType.Default,
          operateType: GlacierMqttSetOperateType.DetachIce,
          params: {
            enable: EnableType.On,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command to device when Detach Ice value was changed to Off', () => {
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.On);

      characteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          moduleType: GlacierMqttSetModuleType.Default,
          operateType: GlacierMqttSetOperateType.DetachIce,
          params: {
            enable: EnableType.Off,
          },
        },
        expect.any(Function)
      );
    });

    it('should revert changing of Detach Ice state when sending Set command to device is failed', () => {
      service.initialize();
      characteristic = service.service.getCharacteristic(HapCharacteristic.On);
      characteristic.updateValue(true);

      characteristic.setValue(false);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = characteristic.value;

      expect(actual).toBeTruthy();
      expect(logMock.debug.mock.calls).toEqual([['Detach Ice State ->', true]]);
    });
  });
});
