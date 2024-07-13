import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { ServiceBase } from './serviecBase.js';
import { DeviceConfig } from '../../config.js';
import { EcoFlowHomebridgePlatform } from 'platform.js';

export class OutputsService extends ServiceBase {
  private readonly acService: Service;
  private readonly dcService: Service;
  private readonly usbService: Service;

  constructor(accessory: PlatformAccessory, platform: EcoFlowHomebridgePlatform, config: DeviceConfig) {
    super(accessory, platform, config);

    this.acService =
      this.accessory.getServiceById(this.platform.Service.Outlet, 'AC') ||
      this.accessory.addService(this.platform.Service.Outlet, 'AC', 'AC');
    this.dcService =
      this.accessory.getServiceById(this.platform.Service.Outlet, 'DC') ||
      this.accessory.addService(this.platform.Service.Outlet, 'DC', 'DC');
    this.usbService =
      this.accessory.getServiceById(this.platform.Service.Outlet, 'USB') ||
      this.accessory.addService(this.platform.Service.Outlet, 'USB', 'USB');
    this.init();
  }

  protected init(): void {
    this.acService
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.getAcState.bind(this));
    // .onSet(this.setAcState.bind(this));

    this.dcService
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.getDcState.bind(this));
    // .onSet(this.setDcState.bind(this));

    this.usbService
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.getUsbState.bind(this));
    // .onSet(this.setUsbState.bind(this));
  }

  async getAcState(): Promise<CharacteristicValue> {
    const state = await this.api.getAcState();
    this.log.debug('AcState ->', state);
    return state;
  }

  async getDcState(): Promise<CharacteristicValue> {
    const state = await this.api.getDcState();
    this.log.debug('DcState ->', state);
    return state;
  }

  async getUsbState(): Promise<CharacteristicValue> {
    const state = await this.api.getUsbState();
    this.log.debug('UsbState ->', state);
    return state;
  }

  // async setUsbState(value: CharacteristicValue): Promise<void> {
  //   this.log.debug('-> UsbState ', value);

  //   await this.api.setUsbState(value as boolean);
  // }
}
