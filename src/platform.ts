import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  HAP,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
  UnknownContext,
} from 'homebridge';

import { Delta2Accessory } from '@ecoflow/accessories/batteries/delta2/delta2Accessory';
import { Delta2MaxAccessory } from '@ecoflow/accessories/batteries/delta2/delta2MaxAccessory';
import { Delta2Simulator } from '@ecoflow/accessories/batteries/delta2/simulations/delta2Simulator';
import { DeltaProAccessory } from '@ecoflow/accessories/batteries/deltapro/deltaProAccessory';
import { DeltaProSimulator } from '@ecoflow/accessories/batteries/deltapro/simulations/deltaProSimulator';
import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { PowerStreamAccessory } from '@ecoflow/accessories/powerstream/powerStreamAccessory';
import { PowerStreamSimulator } from '@ecoflow/accessories/powerstream/simulations/powerStreamSimulator';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { Simulator } from '@ecoflow/apis/simulations/simulator';
import {
  CustomCharacteristics,
  InputConsumptionWattFactory,
  OutputConsumptionWattFactory,
} from '@ecoflow/characteristics/customCharacteristic';
import { DeviceConfig, DeviceModel, EcoFlowConfig } from '@ecoflow/config';
import { Logger } from '@ecoflow/helpers/logger';
import { MachineIdProvider } from '@ecoflow/helpers/machineIdProvider';
import { PLATFORM_NAME, PLUGIN_NAME } from '@ecoflow/settings';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */

export type EcoFlowCharacteristic = typeof Characteristic & typeof CustomCharacteristics;

export class EcoFlowHomebridgePlatform implements DynamicPlatformPlugin {
  private readonly ecoFlowConfig: EcoFlowConfig;
  public readonly Service: typeof Service;
  public readonly Characteristic: EcoFlowCharacteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  private readonly httpApiManager: EcoFlowHttpApiManager = new EcoFlowHttpApiManager();
  private readonly mqttApiManager: EcoFlowMqttApiManager = new EcoFlowMqttApiManager(
    this.httpApiManager,
    new MachineIdProvider()
  );

  constructor(
    private readonly commonLog: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    EcoFlowHomebridgePlatform.InitCustomCharacteristics(api.hap);
    this.ecoFlowConfig = this.config as EcoFlowConfig;
    this.Service = api.hap.Service;
    this.Characteristic = {
      ...api.hap.Characteristic,
      ...CustomCharacteristics,
    } as unknown as EcoFlowCharacteristic;

    this.commonLog.debug('Finished initializing platform:', this.config.platform);

    // Homebridge 1.8.0 introduced a `log.success` method that can be used to log success messages
    // For users that are on a version prior to 1.8.0, we need a 'polyfill' for this method
    if (!this.commonLog.success) {
      this.commonLog.success = commonLog.info;
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      this.registerDevices();
    });
  }

  public static InitCustomCharacteristics(hap: HAP): void {
    CustomCharacteristics.PowerConsumption.InputConsumptionWatts = InputConsumptionWattFactory(hap);
    CustomCharacteristics.PowerConsumption.OutputConsumptionWatts = OutputConsumptionWattFactory(hap);
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  public configureAccessory(accessory: PlatformAccessory) {
    this.commonLog.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  private validateDeviceConfig(config: DeviceConfig): string | undefined {
    if (config.disabled === true) {
      return 'Device is disabled';
    }

    if (config.name === undefined) {
      return "Device's 'name' must be configured";
    }

    if (config.serialNumber === undefined) {
      return "Device's 'serialNumber' must be configured";
    }

    if (config.accessKey === undefined) {
      return "Device's 'accessKey' must be configured";
    }

    if (config.secretKey === undefined) {
      return "Device's 'secretKey' must be configured";
    }
    return undefined;
  }

  private registerDevices(): void {
    const logs: Record<string, Logging> = {};
    const configuredAccessories: PlatformAccessory[] = [];
    const configuredEcoFlowAccessories: EcoFlowAccessoryBase[] = [];
    if (!this.ecoFlowConfig.devices) {
      this.commonLog.warn('Devices are not configured');
      return;
    }
    for (const config of this.ecoFlowConfig.devices) {
      const log = Logger.create(this.commonLog, config.name);
      const validationMessage = this.validateDeviceConfig(config);
      if (validationMessage !== undefined) {
        log.warn(`${validationMessage}. Ignoring the device`);
        continue;
      }

      const existingAccessory = configuredAccessories.find(
        accessory => accessory.context.deviceConfig.serialNumber === config.serialNumber
      );
      if (existingAccessory) {
        log.warn(`Device with the same SN (${config.serialNumber}) already exists. Ignoring the device`);
        continue;
      }

      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(config.serialNumber);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      let accessory = this.accessories.find(accessory => accessory.UUID === uuid);
      let ecoFlowAccessory: EcoFlowAccessoryBase | null = null;
      if (accessory) {
        log.info('Restoring existing accessory from cache');
        ecoFlowAccessory = this.createAccessory(accessory, config, log);
      } else {
        ({ accessory, ecoFlowAccessory } = this.addNewDevice(log, config, uuid));
      }
      configuredAccessories.push(accessory);
      if (ecoFlowAccessory) {
        configuredEcoFlowAccessories.push(ecoFlowAccessory);
      }
      logs[accessory.displayName] = log;
    }
    this.cleanupDevices(configuredAccessories, configuredEcoFlowAccessories, logs);
  }

  private addNewDevice(
    log: Logging,
    config: DeviceConfig,
    uuid: string
  ): { accessory: PlatformAccessory; ecoFlowAccessory: EcoFlowAccessoryBase | null } {
    log.info('Adding new accessory');
    const accessory = new this.api.platformAccessory(config.name, uuid);
    accessory.context.deviceConfig = config;
    const ecoFlowAccessory = this.createAccessory(accessory, config, log);

    if (ecoFlowAccessory) {
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
    return { accessory, ecoFlowAccessory };
  }

  private cleanupDevices(
    configuredAccessories: PlatformAccessory[],
    configuredEcoFlowAccessories: EcoFlowAccessoryBase[],
    logs: Record<string, Logging>
  ): void {
    const removedAccessories: PlatformAccessory[] = [];
    this.accessories
      .filter(accessory => !configuredAccessories.includes(accessory))
      .forEach(accessory => {
        this.commonLog.info('Removing obsolete accessory:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        removedAccessories.push(accessory);
      });
    const ecoFlowAccessories = configuredEcoFlowAccessories.filter(
      ecoFlowAccessory => !removedAccessories.includes(ecoFlowAccessory.accessory)
    );
    this.initialize(ecoFlowAccessories, logs);
  }

  private async initialize(accessories: EcoFlowAccessoryBase[], logs: Record<string, Logging>): Promise<void> {
    for (const accessory of accessories) {
      logs[accessory.accessory.displayName].info('Initializing accessory');
      await accessory.initialize();
      if (accessory.config.simulate !== true) {
        await accessory.initializeDefaultValues();
      }
      await accessory.cleanupServices();
    }
  }

  private createAccessory(
    accessory: PlatformAccessory<UnknownContext>,
    config: DeviceConfig,
    log: Logging
  ): EcoFlowAccessoryBase | null {
    let EcoFlowAccessoryType: EcoFlowAccessoryType | null = null;
    let EcoFlowAccessorySimulatorType: EcoFlowAccessorySimulatorType | undefined = undefined;
    switch (config.model) {
      case DeviceModel.Delta2Max:
        EcoFlowAccessoryType = Delta2MaxAccessory;
        EcoFlowAccessorySimulatorType = Delta2Simulator;
        break;
      case DeviceModel.Delta2:
        EcoFlowAccessoryType = Delta2Accessory;
        EcoFlowAccessorySimulatorType = Delta2Simulator;
        break;
      case DeviceModel.DeltaPro:
        EcoFlowAccessoryType = DeltaProAccessory;
        EcoFlowAccessorySimulatorType = DeltaProSimulator;
        break;
      case DeviceModel.PowerStream:
        EcoFlowAccessoryType = PowerStreamAccessory;
        EcoFlowAccessorySimulatorType = PowerStreamSimulator;
        break;
      default:
        log.warn(`"${config.model}" is not supported. Ignoring the device`);
    }
    config.simulator = EcoFlowAccessorySimulatorType;
    return EcoFlowAccessoryType === null
      ? null
      : new EcoFlowAccessoryType(this, accessory, config, log, this.httpApiManager, this.mqttApiManager);
  }
}

type EcoFlowAccessoryType = new (
  platform: EcoFlowHomebridgePlatform,
  accessory: PlatformAccessory,
  config: DeviceConfig,
  log: Logging,
  httpApiManager: EcoFlowHttpApiManager,
  mqttApiManager: EcoFlowMqttApiManager
) => EcoFlowAccessoryBase;

type EcoFlowAccessorySimulatorType = new () => Simulator;
