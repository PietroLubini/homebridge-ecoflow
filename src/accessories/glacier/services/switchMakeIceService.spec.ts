import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { GlacierAllQuotaData } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  GlacierMqttSetModuleType,
  GlacierMqttSetOperateType,
  IceCubeShapeType,
} from '@ecoflow/accessories/glacier/interfaces/glacierMqttApiContracts';
import { SwitchMakeIceService } from '@ecoflow/accessories/glacier/services/switchMakeIceService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Characteristic, Logging, PlatformAccessory } from 'homebridge';

describe('SwitchMakeIceService', () => {
  let service: SwitchMakeIceService;
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
    hapService = new HapService('Accessory Make Ice Name', HapService.Switch.UUID);
  });

  describe('Small Cubes', () => {
    beforeEach(() => {
      service = new SwitchMakeIceService(ecoFlowAccessoryMock, IceCubeShapeType.Small);
    });

    describe('onOnSet', () => {
      let onCharacteristic: Characteristic;
      beforeEach(() => {
        accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      });

      it('should send Set command to device when Make Ice Cubes value was changed to true', () => {
        service.initialize();
        onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);

        onCharacteristic.setValue(true);

        expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
          {
            id: 0,
            version: '',
            moduleType: GlacierMqttSetModuleType.Default,
            operateType: GlacierMqttSetOperateType.MakeIce,
            params: {
              enable: EnableType.On,
              iceShape: IceCubeShapeType.Small,
            },
          },
          expect.any(Function)
        );
      });

      it('should send Set command to device when Make Ice Cubes value was changed to false', () => {
        service.initialize();
        onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);

        onCharacteristic.setValue(false);

        expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
          {
            id: 0,
            version: '',
            moduleType: GlacierMqttSetModuleType.Default,
            operateType: GlacierMqttSetOperateType.MakeIce,
            params: {
              enable: EnableType.Off,
              iceShape: IceCubeShapeType.Small,
            },
          },
          expect.any(Function)
        );
      });

      it('should revert changing of Make Ice Cubes state when sending Set command to device is failed', () => {
        service.initialize();
        onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
        onCharacteristic.updateValue(true);

        onCharacteristic.setValue(false);
        const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
        revertFunc();
        const actual = onCharacteristic.value;

        expect(actual).toBeTruthy();
        expect(logMock.debug.mock.calls).toEqual([['Make Ice Small Cubes State ->', true]]);
      });
    });
  });

  describe('Large Cubes', () => {
    beforeEach(() => {
      service = new SwitchMakeIceService(ecoFlowAccessoryMock, IceCubeShapeType.Large);
    });

    describe('onOnSet', () => {
      let onCharacteristic: Characteristic;
      beforeEach(() => {
        accessoryMock.getServiceById.mockReturnValueOnce(hapService);
      });

      it('should send Set command to device when Make Ice Cubes value was changed to true', () => {
        service.initialize();
        onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);

        onCharacteristic.setValue(true);

        expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
          {
            id: 0,
            version: '',
            moduleType: GlacierMqttSetModuleType.Default,
            operateType: GlacierMqttSetOperateType.MakeIce,
            params: {
              enable: EnableType.On,
              iceShape: IceCubeShapeType.Large,
            },
          },
          expect.any(Function)
        );
      });

      it('should send Set command to device when Make Ice Cubes value was changed to false', () => {
        service.initialize();
        onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);

        onCharacteristic.setValue(false);

        expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
          {
            id: 0,
            version: '',
            moduleType: GlacierMqttSetModuleType.Default,
            operateType: GlacierMqttSetOperateType.MakeIce,
            params: {
              enable: EnableType.Off,
              iceShape: IceCubeShapeType.Large,
            },
          },
          expect.any(Function)
        );
      });

      it('should revert changing of Make Ice Cubes state when sending Set command to device is failed', () => {
        service.initialize();
        onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
        onCharacteristic.updateValue(true);

        onCharacteristic.setValue(false);
        const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
        revertFunc();
        const actual = onCharacteristic.value;

        expect(actual).toBeTruthy();
        expect(logMock.debug.mock.calls).toEqual([['Make Ice Large Cubes State ->', true]]);
      });
    });
  });
});
