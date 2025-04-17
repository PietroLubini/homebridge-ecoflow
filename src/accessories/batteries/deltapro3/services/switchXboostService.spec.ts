import { DeltaPro3AllQuotaData } from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3HttpApiContracts';
import { SwitchXboostService } from '@ecoflow/accessories/batteries/deltapro3/services/switchXboostService';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { Characteristic, Logging, PlatformAccessory } from 'homebridge';

describe('SwitchXboostService', () => {
  let service: SwitchXboostService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<DeltaPro3AllQuotaData>>;
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
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<DeltaPro3AllQuotaData>>;
    service = new SwitchXboostService(ecoFlowAccessoryMock);
    hapService = new HapService('Accessory Switch Name', HapService.Switch.UUID);
  });

  describe('processOnSetOn', () => {
    let onCharacteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getServiceById.mockReturnValueOnce(hapService);
    });

    it('should send Set command to device when X-Boost value was changed to true', () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);

      onCharacteristic.setValue(true);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          sn: 'sn1',
          cmdId: 17,
          dirDest: 1,
          dirSrc: 1,
          cmdFunc: 254,
          dest: 2,
          needAck: true,
          params: {
            cfgXboostEn: true,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command to device when X-Boost value was changed to false', () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);

      onCharacteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          sn: 'sn1',
          cmdId: 17,
          dirDest: 1,
          dirSrc: 1,
          cmdFunc: 254,
          dest: 2,
          needAck: true,
          params: {
            cfgXboostEn: false,
          },
        },
        expect.any(Function)
      );
    });

    it('should revert changing of X-Boost state when sending Set command to device is failed', () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
      onCharacteristic.updateValue(true);

      onCharacteristic.setValue(false);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = onCharacteristic.value;

      expect(actual).toBeTruthy();
      expect(logMock.debug.mock.calls).toEqual([['X-Boost State ->', true]]);
    });
  });
});
