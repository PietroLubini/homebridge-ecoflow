import { PlatformAccessory, Service } from 'homebridge';
import { ServiceBase } from './serviceBase.js';
import { EcoFlowMqttApi } from 'accessories/apis/ecoFlowMqttApi.js';
import { EcoFlowHomebridgePlatform } from 'platform.js';
import { DeviceConfig } from 'config.js';
import { MqttSetMessage, MqttSetMessageParams } from 'accessories/apis/interfaces/ecoFlowMqttContacts.js';

export abstract class OutletsServiceBase extends ServiceBase {
  protected readonly service: Service;

  constructor(
    serviceSubType: string,
    accessory: PlatformAccessory,
    platform: EcoFlowHomebridgePlatform,
    config: DeviceConfig,
    api: EcoFlowMqttApi
  ) {
    super(accessory, platform, config, api);

    this.service = this.getOrAddService(`${config.name} ${serviceSubType}`);
    this.accessory.removeService(this.service);
    this.service = this.getOrAddService(`${config.name} ${serviceSubType}`);
    this.initService();
  }

  protected abstract setOn(value: boolean): Promise<void>;

  protected async publishEnabled<TParams extends MqttSetMessageParams>(
    moduleType: number,
    operateType: string,
    params: TParams
  ): Promise<void> {
    const data: MqttSetMessage<TParams> = {
      id: Math.floor(Math.random() * 1000000),
      version: '1.0',
      moduleType,
      operateType,
      params,
    };
    await this.api.publish('/open/<certificateAccount>/<sn>/set', this.config.serialNumber, data);
  }

  private initService(): void {
    this.service.getCharacteristic(this.platform.Characteristic.On).onSet(value => this.setOn(value as boolean));
  }

  private getOrAddService(name: string): Service {
    const service =
      this.accessory.getServiceById(this.platform.Service.Outlet, name) ||
      this.accessory.addService(this.platform.Service.Outlet, name, name);

    const nameCharacteristic =
      service.getCharacteristic(this.platform.Characteristic.Name) ||
      service.addCharacteristic(this.platform.Characteristic.Name);
    nameCharacteristic.setValue(name);

    return service;
  }
}
