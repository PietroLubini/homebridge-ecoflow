import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { SmartPlugAllQuotaData } from '@ecoflow/accessories/smartplug/interfaces/smartPlugHttpApiContracts';
import { OutletService } from '@ecoflow/accessories/smartplug/services/outletService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { API, Characteristic, Logging, PlatformAccessory } from 'homebridge';

describe('OutletService', () => {
  let service: OutletService;
  let ecoFlowAccessoryMock: jest.Mocked<EcoFlowAccessoryWithQuotaBase<SmartPlugAllQuotaData>>;
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
      },
      httpApiManager: httpApiManagerMock,
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowAccessoryWithQuotaBase<SmartPlugAllQuotaData>>;
    service = new OutletService(ecoFlowAccessoryMock);
    hapService = new HapService('Accessory Outlet Name', HapService.Outlet.UUID);
  });

  describe('processOnSetOn', () => {
    let onCharacteristic: Characteristic;
    beforeEach(() => {
      accessoryMock.getService.mockReturnValueOnce(hapService);
    });

    it('should send Set command of Switch cmdCode to device when Enabled value was changed to true', () => {
      service = new OutletService(ecoFlowAccessoryMock);
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);

      onCharacteristic.setValue(true);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          cmdCode: 'WN511_SOCKET_SET_PLUG_SWITCH_MESSAGE',
          params: {
            plugSwitch: 1,
          },
        },
        expect.any(Function)
      );
    });

    it('should send Set command of Switch cmdCode to device when Enabled value was changed to false', () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);

      onCharacteristic.setValue(false);

      expect(ecoFlowAccessoryMock.sendSetCommand).toHaveBeenCalledWith(
        {
          id: 0,
          version: '',
          cmdCode: 'WN511_SOCKET_SET_PLUG_SWITCH_MESSAGE',
          params: {
            plugSwitch: 0,
          },
        },
        expect.any(Function)
      );
    });

    it('should revert changing of Enabled state when sending Set command to device is failed', () => {
      service.initialize();
      onCharacteristic = service.service.getCharacteristic(HapCharacteristic.On);
      onCharacteristic.updateValue(true);

      onCharacteristic.setValue(false);
      const revertFunc = ecoFlowAccessoryMock.sendSetCommand.mock.calls[0][1];
      revertFunc();
      const actual = onCharacteristic.value;

      expect(actual).toBeTruthy();
      expect(logMock.debug.mock.calls).toEqual([['State ->', true]]);
    });
  });
});
