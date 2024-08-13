import { BatteryAccessory } from '@ecoflow/accessories/batteries/batteryAccessory';
import { Delta2Accessory } from '@ecoflow/accessories/batteries/delta2Accessory';
import { Delta2MaxAccessory } from '@ecoflow/accessories/batteries/delta2maxAccessory';
import { EcoFlowHttpApi } from '@ecoflow/apis/ecoFlowHttpApi';
import { EcoFlowMqttApi } from '@ecoflow/apis/ecoFlowMqttApi';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { DeviceConfig, DeviceModel, EcoFlowConfig } from '@ecoflow/config';
import { Logger } from '@ecoflow/helpers/logger';
import { MachineIdProvider } from '@ecoflow/helpers/machineIdProvider';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { API, HAP, Logging, PlatformAccessory } from 'homebridge';

jest.mock('@ecoflow/accessories/batteries/delta2Accessory');
jest.mock('@ecoflow/accessories/batteries/delta2maxAccessory');
jest.mock('@ecoflow/apis/EcoFlowHttpApi');
jest.mock('@ecoflow/apis/EcoFlowMqttApi');
jest.mock('@ecoflow/helpers/MachineIdProvider');

describe('EcoFlowHomebridgePlatform', () => {
  let commonLogMock: jest.Mocked<Logging>;
  let accessoryFactoryMock: jest.Mock;
  let apiMock: jest.Mocked<API>;
  let hapMock: jest.Mocked<HAP>;
  let uuidGenerateMock: jest.Mock;
  let config: EcoFlowConfig;
  let platform: EcoFlowHomebridgePlatform;

  beforeEach(() => {
    accessoryFactoryMock = jest.fn();
    commonLogMock = { debug: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as jest.Mocked<Logging>;
    uuidGenerateMock = jest.fn();
    hapMock = {
      Characteristic: HapCharacteristic,
      Service: HapService,
      uuid: { generate: uuidGenerateMock },
    } as unknown as jest.Mocked<HAP>;
    apiMock = {
      hap: hapMock,
      on: jest.fn(),
      platformAccessory: accessoryFactoryMock,
      registerPlatformAccessories: jest.fn(),
      unregisterPlatformAccessories: jest.fn(),
    } as unknown as jest.Mocked<API>;
    config = { platform: 'EcoFlowHomebridge', name: 'EcoFlowTest' } as unknown as EcoFlowConfig;
  });

  describe('constructor', () => {
    it('should initialize EcoFlow config when creating new platform', () => {
      platform = new EcoFlowHomebridgePlatform(commonLogMock, config, apiMock);

      expect(platform.config).toEqual(config);
      expect(commonLogMock.debug).toHaveBeenCalledWith('Finished initializing platform:', 'EcoFlowHomebridge');
    });

    it('should initialize Service property when creating new platform', () => {
      platform = new EcoFlowHomebridgePlatform(commonLogMock, config, apiMock);

      expect(platform.Service).toEqual(HapService);
    });

    it('should initialize Characteristic property when creating new platform', () => {
      platform = new EcoFlowHomebridgePlatform(commonLogMock, config, apiMock);

      expect(platform.Characteristic).toEqual({
        ...HapCharacteristic,
        ...CustomCharacteristics,
      });
    });

    it('should initialize InputConsumptionWatt characteristic when creating new platform', () => {
      platform = new EcoFlowHomebridgePlatform(commonLogMock, config, apiMock);

      expect(CustomCharacteristics.PowerConsumption.InputConsumptionWatts).not.toBeNull();
    });

    it('should initialize OutputConsumptionWatts characteristic when creating new platform', () => {
      platform = new EcoFlowHomebridgePlatform(commonLogMock, config, apiMock);

      expect(CustomCharacteristics.PowerConsumption.OutputConsumptionWatts).not.toBeNull();
    });

    it('should initialize success method of log when creating new platform and success method is not defined', () => {
      platform = new EcoFlowHomebridgePlatform(commonLogMock, config, apiMock);

      expect(commonLogMock.success).toBe(commonLogMock.info);
    });

    it('should subscribe on didFinishLaunching when creating new platform', () => {
      platform = new EcoFlowHomebridgePlatform(commonLogMock, config, apiMock);

      expect(apiMock.on).toHaveBeenCalledWith('didFinishLaunching', expect.any(Function));
    });
  });

  describe('registerDevices', () => {
    let registerDevices: () => void;
    let logCreatorIndex: number;
    let log1Mock: jest.Mocked<Logging>;
    let log2Mock: jest.Mocked<Logging>;
    let accessory1Mock: jest.Mocked<PlatformAccessory>;
    let accessory2Mock: jest.Mocked<PlatformAccessory>;
    let ecoflowAccessory1Mock: jest.Mocked<Delta2Accessory>;
    let ecoflowAccessory2Mock: jest.Mocked<Delta2MaxAccessory>;
    let machineIdProviderMock: jest.Mocked<MachineIdProvider>;
    let httpApiMock: jest.Mocked<EcoFlowHttpApi>;
    let mqttApiMock: jest.Mocked<EcoFlowMqttApi>;
    let device1Config: DeviceConfig;
    let device2Config: DeviceConfig;

    function createAccessory<TAccessory extends BatteryAccessory>(
      Accessory: new (
        platform: EcoFlowHomebridgePlatform,
        accessory: PlatformAccessory,
        config: DeviceConfig,
        log: Logging,
        httpApi: EcoFlowHttpApi,
        mqttApi: EcoFlowMqttApi
      ) => TAccessory,
      logMock: jest.Mocked<Logging>,
      accessoryMock: jest.Mocked<PlatformAccessory>
    ): jest.Mocked<TAccessory> {
      const ecoFlowAccessoryMock = new Accessory(
        platform,
        accessory1Mock,
        {} as DeviceConfig,
        logMock,
        httpApiMock,
        mqttApiMock
      ) as jest.Mocked<TAccessory>;
      const accessoryBaseMock = ecoFlowAccessoryMock as jest.Mocked<BatteryAccessory>;
      accessoryBaseMock.initialize.mockReset();
      accessoryBaseMock.cleanupServices.mockReset();
      if (!ecoFlowAccessoryMock.accessory) {
        Object.defineProperty(ecoFlowAccessoryMock, 'accessory', { value: accessoryMock });
      }
      (Accessory as jest.Mock).mockImplementation(() => ecoFlowAccessoryMock);

      return ecoFlowAccessoryMock;
    }

    beforeEach(() => {
      device1Config = {
        name: 'device1',
        model: DeviceModel.Delta2,
        serialNumber: 'sn1',
      } as unknown as DeviceConfig;
      device2Config = {
        name: 'device2',
        model: DeviceModel.Delta2Max,
        serialNumber: 'sn2',
      } as unknown as DeviceConfig;
      log1Mock = { info: jest.fn(), warn: jest.fn() } as unknown as jest.Mocked<Logging>;
      log2Mock = { info: jest.fn(), warn: jest.fn() } as unknown as jest.Mocked<Logging>;
      accessory1Mock = {
        displayName: 'accessory1',
        UUID: 'id1',
        context: {},
      } as unknown as jest.Mocked<PlatformAccessory>;
      accessory2Mock = {
        displayName: 'accessory2',
        UUID: 'id2',
        context: {},
      } as unknown as jest.Mocked<PlatformAccessory>;
      machineIdProviderMock = new MachineIdProvider(log1Mock) as unknown as jest.Mocked<MachineIdProvider>;
      httpApiMock = new EcoFlowHttpApi({} as DeviceConfig, log1Mock) as unknown as jest.Mocked<EcoFlowHttpApi>;
      mqttApiMock = new EcoFlowMqttApi(
        httpApiMock,
        log1Mock,
        machineIdProviderMock
      ) as unknown as jest.Mocked<EcoFlowMqttApi>;
      ecoflowAccessory1Mock = createAccessory(Delta2Accessory, log1Mock, accessory1Mock);
      ecoflowAccessory2Mock = createAccessory(Delta2MaxAccessory, log2Mock, accessory2Mock);
      platform = new EcoFlowHomebridgePlatform(commonLogMock, config, apiMock);
      registerDevices = apiMock.on.mock.calls[0][1];
      uuidGenerateMock.mockImplementation((serialNumber: string) => {
        if (serialNumber === 'sn1') {
          return 'id1';
        } else if (serialNumber === 'sn2') {
          return 'id2';
        }
        return undefined;
      });
      logCreatorIndex = 0;
      jest.spyOn(Logger, 'create').mockImplementation(() => {
        switch (logCreatorIndex) {
          case 0:
            return log1Mock;
          case 1:
            return log2Mock;
          default:
            return undefined as unknown as Logging;
        }
      });
      accessoryFactoryMock.mockImplementation((_, id: string) => {
        if (id === 'id1') {
          return accessory1Mock;
        } else if (id === 'id2') {
          return accessory2Mock;
        }
        return undefined;
      });
    });

    describe('validation', () => {
      it('should not register devices when devices are not configured', () => {
        registerDevices();

        expect(commonLogMock.warn).toHaveBeenCalledWith('Devices are not configured');
      });

      it('should not register device when serial number is duplicated', () => {
        device2Config.serialNumber = 'sn1';
        accessory2Mock.UUID = 'id1';
        accessory1Mock.context.deviceConfig = device1Config;
        config.devices = [device1Config, device2Config];

        registerDevices();

        expect(log1Mock.warn).toHaveBeenCalledWith('Device with the same SN (sn1) already exists. Ignoring the device');
      });

      it('should not register device when model is unknown', () => {
        config.devices = [
          {
            name: 'device1',
            model: 'DeltaMax',
            serialNumber: 'sn1',
          } as unknown as DeviceConfig,
        ];

        registerDevices();

        expect(apiMock.registerPlatformAccessories).not.toHaveBeenCalled();
        expect(log1Mock.warn).toHaveBeenCalledWith('"DeltaMax" is not supported. Ignoring the device');
      });
    });

    describe('newDevice', () => {
      it('should register device when accessory is not in cache yet', () => {
        config.devices = [device1Config];

        registerDevices();

        expect(accessory1Mock.context.deviceConfig).toBe(device1Config);
        expect(log1Mock.info.mock.calls).toEqual([['Adding new accessory'], ['Initializing accessory']]);
      });

      it('should register platform accessory when new device is created', () => {
        config.devices = [device1Config, device2Config];

        registerDevices();

        expect(apiMock.registerPlatformAccessories.mock.calls).toEqual([
          ['@pietrolubini/homebridge-ecoflow', 'EcoFlowHomebridge', [accessory1Mock]],
          ['@pietrolubini/homebridge-ecoflow', 'EcoFlowHomebridge', [accessory2Mock]],
        ]);
      });

      it('should initialize device when registering non cached devices', () => {
        config.devices = [device1Config, device2Config];

        registerDevices();

        expect(ecoflowAccessory1Mock.initialize).toHaveBeenCalled();
        expect(ecoflowAccessory1Mock.cleanupServices).toHaveBeenCalled();
        expect(ecoflowAccessory2Mock.initialize).toHaveBeenCalled();
        expect(ecoflowAccessory2Mock.cleanupServices).toHaveBeenCalled();
      });
    });

    describe('cachedDevice', () => {
      it('should register device when accessory is already cached', () => {
        platform.accessories.push(accessory1Mock);
        config.devices = [device1Config];

        registerDevices();

        expect(log1Mock.info.mock.calls).toEqual([
          ['Restoring existing accessory from cache'],
          ['Initializing accessory'],
        ]);
      });

      it('should not register platform accessory when cached device is created', () => {
        platform.accessories.push(accessory1Mock);
        config.devices = [device1Config];

        registerDevices();

        expect(apiMock.registerPlatformAccessories).not.toHaveBeenCalled();
      });

      it('should initialize device when registering cached device', () => {
        platform.accessories.push(accessory1Mock);
        config.devices = [device1Config];

        registerDevices();

        expect(ecoflowAccessory1Mock.initialize).toHaveBeenCalled();
        expect(ecoflowAccessory1Mock.cleanupServices).toHaveBeenCalled();
      });
    });

    describe('cleanupDevices', () => {
      it('should remove obsolete device when it is not specified in config', () => {
        platform.accessories.push(accessory1Mock);
        config.devices = [device2Config];

        registerDevices();

        expect(apiMock.unregisterPlatformAccessories).toHaveBeenCalledWith(
          '@pietrolubini/homebridge-ecoflow',
          'EcoFlowHomebridge',
          [accessory1Mock]
        );
        expect(commonLogMock.info.mock.calls).toEqual([['Removing obsolete accessory:', 'accessory1']]);
      });
    });
  });

  describe('configureAccessory', () => {
    beforeEach(() => {
      platform = new EcoFlowHomebridgePlatform(commonLogMock, config, apiMock);
    });

    it('should add accessory to list of accessories when it is restored from cache', () => {
      const accessoryMock = { displayName: 'cached accessory1' } as unknown as jest.Mocked<PlatformAccessory>;

      platform.configureAccessory(accessoryMock);

      expect(commonLogMock.info).toHaveBeenCalledWith('Loading accessory from cache:', 'cached accessory1');
    });
  });
});
