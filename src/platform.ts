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

import { Delta2Accessory } from '@ecoflow/accessories/batteries/delta2Accessory';
import { Delta2MaxAccessory } from '@ecoflow/accessories/batteries/delta2maxAccessory';
import { EcoFlowAccessory } from '@ecoflow/accessories/ecoFlowAccessory';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
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
      this.commonLog.debug('Executed didFinishLaunching callback');
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

  private registerDevices(): void {
    const logs: Record<string, Logging> = {};
    const configuredAccessories: PlatformAccessory[] = [];
    const configuredEcoFlowAccessories: EcoFlowAccessory[] = [];
    if (!this.ecoFlowConfig.devices) {
      this.commonLog.warn('Devices are not configured');
      return;
    }
    for (const config of this.ecoFlowConfig.devices) {
      const log = Logger.create(this.commonLog, config.name);
      const existingAccessory = configuredAccessories.find(
        accessory => accessory.context.deviceConfig.serialNumber === config.serialNumber
      );
      // if (existingAccessory) {
      //   log.warn(`Device with the same SN (${config.serialNumber}) already exists. Ignoring the device`);
      //   continue;
      // }

      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(config.serialNumber);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      let accessory = this.accessories.find(accessory => accessory.UUID === uuid);
      let ecoFlowAccessory: EcoFlowAccessory | null = null;
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
  ): { accessory: PlatformAccessory; ecoFlowAccessory: EcoFlowAccessory | null } {
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
    configuredEcoFlowAccessories: EcoFlowAccessory[],
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

  private async initialize(accessories: EcoFlowAccessory[], logs: Record<string, Logging>): Promise<void> {
    for (const accessory of accessories) {
      logs[accessory.accessory.displayName].info('Initializing accessory');
      await accessory.initialize();
      await accessory.initializeDefaultValues();
      await accessory.cleanupServices();
    }
  }

  private createAccessory(
    accessory: PlatformAccessory<UnknownContext>,
    config: DeviceConfig,
    log: Logging
  ): EcoFlowAccessory | null {
    let ecoFlowAccessory: EcoFlowAccessory | null = null;
    switch (config.model) {
      case DeviceModel.Delta2Max:
        ecoFlowAccessory = new Delta2MaxAccessory(
          this,
          accessory,
          config,
          log,
          this.httpApiManager,
          this.mqttApiManager
        );
        break;
      case DeviceModel.Delta2:
        ecoFlowAccessory = new Delta2Accessory(this, accessory, config, log, this.httpApiManager, this.mqttApiManager);
        break;
      default:
        log.warn(`"${config.model}" is not supported. Ignoring the device`);
    }
    return ecoFlowAccessory;
  }
}
