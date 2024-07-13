import {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
  UnknownContext,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { DeviceConfig, DeviceModel, EcoFlowConfig } from './config.js';
import { EcoFlowAccessory } from './accessories/ecoFlowAccessory.js';
import { Delta2MaxAccessory } from './accessories/delta2maxAccessory.js';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class EcoFlowHomebridgePlatform implements DynamicPlatformPlugin {
  private readonly ecoFlowConfig: EcoFlowConfig;
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.ecoFlowConfig = this.config as EcoFlowConfig;
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.platform);

    // Homebridge 1.8.0 introduced a `log.success` method that can be used to log success messages
    // For users that are on a version prior to 1.8.0, we need a 'polyfill' for this method
    if (!log.success) {
      log.success = log.info;
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.initializeDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  initializeDevices() {
    this.log.debug('devices:', this.ecoFlowConfig.devices);
    for (const deviceConfig of this.ecoFlowConfig.devices) {
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(deviceConfig.serialNumber);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        this.createAccessory(existingAccessory, deviceConfig);
      } else {
        this.log.info('Adding new accessory:', deviceConfig.name);
        const accessory = new this.api.platformAccessory(deviceConfig.name, uuid);
        accessory.context.deviceConfig = deviceConfig;
        this.createAccessory(accessory, deviceConfig);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [ accessory ]);
      }
    }
  }

  createAccessory(accessory: PlatformAccessory<UnknownContext>, config: DeviceConfig): EcoFlowAccessory {
    switch(config.model) {
      case DeviceModel.Delta2Max:
        return new Delta2MaxAccessory(this, accessory, config);
      default:
        throw new TypeError(`"${config.model}" is not supported`);
    }
  }
}
