import { Delta2Accessory } from '@ecoflow/accessories/batteries/delta2Accessory';
import { Delta2MaxAccessory } from '@ecoflow/accessories/batteries/delta2maxAccessory';
import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { PowerStreamAccessory } from '@ecoflow/accessories/powerstream/powerStreamAccessory';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { CustomCharacteristics } from '@ecoflow/characteristics/customCharacteristic';
import { DeviceConfig, DeviceModel, EcoFlowConfig } from '@ecoflow/config';
import { Logger } from '@ecoflow/helpers/logger';
import { MachineIdProvider } from '@ecoflow/helpers/machineIdProvider';
import { sleep } from '@ecoflow/helpers/tests/sleep';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic as HapCharacteristic, Service as HapService } from 'hap-nodejs';
import { API, HAP, Logging, PlatformAccessory } from 'homebridge';

jest.mock('@ecoflow/accessories/batteries/delta2Accessory');
jest.mock('@ecoflow/accessories/batteries/delta2maxAccessory');
jest.mock('@ecoflow/accessories/powerstream/powerStreamAccessory');
jest.mock('@ecoflow/apis/ecoFlowHttpApiManager');
jest.mock('@ecoflow/apis/ecoFlowMqttApiManager');
jest.mock('@ecoflow/helpers/machineIdProvider');

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
    let delta2AccessoryMock: jest.Mocked<Delta2Accessory>;
    let delta2MaxAccessoryMock: jest.Mocked<Delta2MaxAccessory>;
    let machineIdProviderMock: jest.Mocked<MachineIdProvider>;
    let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
    let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
    let delta2Config: DeviceConfig;
    let delta2MaxConfig: DeviceConfig;

    function createAccessory<TAccessory extends EcoFlowAccessoryBase>(
      Accessory: new (
        platform: EcoFlowHomebridgePlatform,
        accessory: PlatformAccessory,
        config: DeviceConfig,
        log: Logging,
        httpApiManager: EcoFlowHttpApiManager,
        mqttApiManager: EcoFlowMqttApiManager
      ) => TAccessory,
      deviceConfig: DeviceConfig,
      logMock: jest.Mocked<Logging>,
      accessoryMock: jest.Mocked<PlatformAccessory>
    ): jest.Mocked<TAccessory> {
      const ecoFlowAccessoryMock = new Accessory(
        platform,
        accessory1Mock,
        {} as DeviceConfig,
        logMock,
        httpApiManagerMock,
        mqttApiManagerMock
      ) as jest.Mocked<TAccessory>;
      const accessoryBaseMock = ecoFlowAccessoryMock as jest.Mocked<EcoFlowAccessoryBase>;
      accessoryBaseMock.initialize = jest.fn().mockResolvedValue(undefined);
      accessoryBaseMock.initializeDefaultValues.mockReset();
      accessoryBaseMock.cleanupServices.mockReset();
      Object.defineProperty(ecoFlowAccessoryMock, 'accessory', { value: accessoryMock, configurable: true });
      Object.defineProperty(ecoFlowAccessoryMock, 'config', { value: deviceConfig, configurable: true });
      (Accessory as jest.Mock).mockImplementation(() => ecoFlowAccessoryMock);

      return ecoFlowAccessoryMock;
    }

    async function waitInitializationDone(): Promise<void> {
      return sleep(50);
    }

    beforeEach(() => {
      delta2Config = {
        name: 'device1',
        model: DeviceModel.Delta2,
        serialNumber: 'sn1',
      } as unknown as DeviceConfig;
      delta2MaxConfig = {
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
      } as jest.Mocked<PlatformAccessory>;
      accessory2Mock = {
        displayName: 'accessory2',
        UUID: 'id2',
        context: {},
      } as jest.Mocked<PlatformAccessory>;
      machineIdProviderMock = new MachineIdProvider() as jest.Mocked<MachineIdProvider>;
      httpApiManagerMock = new EcoFlowHttpApiManager() as jest.Mocked<EcoFlowHttpApiManager>;
      mqttApiManagerMock = new EcoFlowMqttApiManager(
        httpApiManagerMock,
        machineIdProviderMock
      ) as jest.Mocked<EcoFlowMqttApiManager>;
      delta2AccessoryMock = createAccessory(Delta2Accessory, delta2Config, log1Mock, accessory1Mock);
      delta2MaxAccessoryMock = createAccessory(Delta2MaxAccessory, delta2MaxConfig, log2Mock, accessory2Mock);
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
        delta2MaxConfig.serialNumber = 'sn1';
        accessory2Mock.UUID = 'id1';
        accessory1Mock.context.deviceConfig = delta2Config;
        config.devices = [delta2Config, delta2MaxConfig];

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
        config.devices = [delta2Config];

        registerDevices();

        expect(accessory1Mock.context.deviceConfig).toBe(delta2Config);
        expect(log1Mock.info.mock.calls).toEqual([['Adding new accessory'], ['Initializing accessory']]);
      });

      it('should register platform accessory when new device is created', () => {
        config.devices = [delta2Config, delta2MaxConfig];

        registerDevices();

        expect(apiMock.registerPlatformAccessories.mock.calls).toEqual([
          ['@pietrolubini/homebridge-ecoflow', 'EcoFlowHomebridge', [accessory1Mock]],
          ['@pietrolubini/homebridge-ecoflow', 'EcoFlowHomebridge', [accessory2Mock]],
        ]);
      });

      it('should initialize device when registering non cached devices', async () => {
        config.devices = [delta2Config, delta2MaxConfig];

        registerDevices();
        await waitInitializationDone();

        expect(delta2AccessoryMock.initialize).toHaveBeenCalled();
        expect(delta2AccessoryMock.initializeDefaultValues).toHaveBeenCalled();
        expect(delta2AccessoryMock.cleanupServices).toHaveBeenCalled();
        expect(delta2MaxAccessoryMock.initialize).toHaveBeenCalled();
        expect(delta2MaxAccessoryMock.initializeDefaultValues).toHaveBeenCalled();
        expect(delta2MaxAccessoryMock.cleanupServices).toHaveBeenCalled();
      });

      it('should ignore initialization of default values when registering simulation of device', async () => {
        delta2Config.simulate = true;
        config.devices = [delta2Config];

        registerDevices();
        await waitInitializationDone();

        expect(delta2AccessoryMock.initialize).toHaveBeenCalled();
        expect(delta2AccessoryMock.initializeDefaultValues).not.toHaveBeenCalled();
        expect(delta2AccessoryMock.cleanupServices).toHaveBeenCalled();
      });
    });

    describe('createAccessory', () => {
      it('should register Delta2 accessory when model is Delta2 in config', () => {
        config.devices = [delta2Config];

        registerDevices();

        expect(delta2AccessoryMock.initialize).toHaveBeenCalled();
      });

      it('should register Delta2Max accessory when model is Delta2Max in config', () => {
        config.devices = [delta2MaxConfig];

        registerDevices();

        expect(delta2MaxAccessoryMock.initialize).toHaveBeenCalled();
      });

      it('should register PowerStream accessory when model is PowerStream in config', () => {
        config.devices = [
          {
            name: 'device3',
            model: DeviceModel.PowerStream,
            serialNumber: 'sn2',
          } as unknown as DeviceConfig,
        ];
        const powerStreamAccessoryMock = createAccessory(
          PowerStreamAccessory,
          config.devices[0],
          log2Mock,
          accessory2Mock
        );

        registerDevices();

        expect(powerStreamAccessoryMock.initialize).toHaveBeenCalled();
      });
    });

    describe('cachedDevice', () => {
      it('should register device when accessory is already cached', () => {
        platform.accessories.push(accessory1Mock);
        config.devices = [delta2Config];

        registerDevices();

        expect(log1Mock.info.mock.calls).toEqual([
          ['Restoring existing accessory from cache'],
          ['Initializing accessory'],
        ]);
      });

      it('should not register platform accessory when cached device is created', () => {
        platform.accessories.push(accessory1Mock);
        config.devices = [delta2Config];

        registerDevices();

        expect(apiMock.registerPlatformAccessories).not.toHaveBeenCalled();
      });

      it('should initialize device when registering cached device', async () => {
        platform.accessories.push(accessory1Mock);
        config.devices = [delta2Config];

        registerDevices();
        await waitInitializationDone();

        expect(delta2AccessoryMock.initialize).toHaveBeenCalled();
        expect(delta2AccessoryMock.initializeDefaultValues).toHaveBeenCalled();
        expect(delta2AccessoryMock.cleanupServices).toHaveBeenCalled();
      });

      it('should cleanupServices of initialized device when registering cached device', async () => {
        platform.accessories.push(accessory1Mock);
        config.devices = [delta2Config];

        registerDevices();
        await waitInitializationDone();

        expect(delta2AccessoryMock.initialize).toHaveBeenCalled();
        expect(delta2AccessoryMock.initializeDefaultValues).toHaveBeenCalled();
        expect(delta2AccessoryMock.cleanupServices).toHaveBeenCalled();
      });
    });

    describe('cleanupDevices', () => {
      it('should remove obsolete device when it is not specified in config', () => {
        platform.accessories.push(accessory1Mock);
        config.devices = [delta2MaxConfig];

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
