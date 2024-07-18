import { Service } from 'homebridge';
import { ServiceBase } from './serviceBase.js';
import { MqttSetMessage, MqttSetMessageParams } from 'accessories/apis/interfaces/ecoFlowMqttContacts.js';
import { EcoFlowAccessory } from 'accessories/ecoFlowAccessory.js';

export abstract class OutletsServiceBase extends ServiceBase {
  constructor(private readonly serviceSubType: string, ecoFlowAccessory: EcoFlowAccessory) {
    super(ecoFlowAccessory);
  }

  public updateState(state: boolean): void {
    this.log.debug(`${this.serviceSubType} State ->`, state);
    this.service.getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.On).updateValue(state);
  }

  public updateInUse(isInUse: boolean): void {
    this.log.debug(`${this.serviceSubType} InUse ->`, isInUse);
    this.service.getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.OutletInUse).updateValue(isInUse);
  }

  protected override createService(): Service {
    const service = this.getOrAddService(this.ecoFlowAccessory.config.name, this.serviceSubType);
    this.addCharacteristics(service);
    return service;
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
    await this.ecoFlowAccessory.mqttApi.publish(
      '/open/<certificateAccount>/<sn>/set',
      this.ecoFlowAccessory.config.serialNumber,
      data
    );
  }

  private addCharacteristics(service: Service): void {
    service
      .getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.On)
      .onSet(value => this.setOn(value as boolean));
  }

  private getOrAddService(deviceName: string, serviceSubType: string): Service {
    const serviceName = deviceName + ' ' + serviceSubType;
    const service =
      this.ecoFlowAccessory.accessory.getServiceById(this.ecoFlowAccessory.platform.Service.Outlet, serviceSubType) ||
      this.ecoFlowAccessory.accessory.addService(
        this.ecoFlowAccessory.platform.Service.Outlet,
        serviceName,
        serviceSubType
      );

    service.setCharacteristic(this.ecoFlowAccessory.platform.Characteristic.Name, serviceName);

    return service;
  }
}
