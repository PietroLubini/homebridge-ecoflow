import { Service } from 'homebridge';
import { EcoFlowAccessory } from '../accessories/ecoFlowAccessory.js';
import { ServiceBase } from './serviceBase.js';

export interface MqttSetEnabledMessageParams {
  enabled: number;
}

export abstract class OutletsServiceBase extends ServiceBase {
  constructor(
    private readonly serviceSubType: string,
    ecoFlowAccessory: EcoFlowAccessory
  ) {
    super(ecoFlowAccessory);
  }

  public updateState(state: boolean): void {
    this.log.debug(`${this.serviceSubType} State ->`, state);
    this.service.getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.On).updateValue(state);
  }

  public updateConsumption(watt: number): void {
    // W
    const prevWatt = this.service.getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.PowerConsumption.Watt)
      .value as number;
    this.log.debug(`${this.serviceSubType} Watt ${prevWatt} ->`, watt);
    this.service
      .getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.PowerConsumption.Watt)
      .updateValue(watt);

    // kWh
    // const prevKWatt = this.service.getCharacteristic(
    //   this.ecoFlowAccessory.platform.Characteristic.PowerConsumption.KilowattHour
    // ).value as number;
    // const kiloWatt = watt / 1000;
    // this.log.debug(`${this.serviceSubType} kWh ${prevKWatt} ->`, kiloWatt);
    // this.service
    //   .getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.PowerConsumption.KilowattHour)
    //   .updateValue(kiloWatt);

    // Ampere
    const prevAmpere = this.service.getCharacteristic(
      this.ecoFlowAccessory.platform.Characteristic.PowerConsumption.Ampere
    ).value;
    const ampere = watt / 220;
    this.log.debug(`${this.serviceSubType} Ampere ${prevAmpere} ->`, ampere);
    this.service
      .getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.PowerConsumption.Ampere)
      .updateValue(ampere);

    // V
    const prevVolt = this.service.getCharacteristic(
      this.ecoFlowAccessory.platform.Characteristic.PowerConsumption.Volt
    ).value;
    const volt = 220 + prevWatt / 1000;
    this.log.debug(`${this.serviceSubType} Volt ${prevVolt} ->`, volt);
    this.service
      .getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.PowerConsumption.Volt)
      .updateValue(volt);

    // InUse
    const isInUse = watt > 0;
    this.log.debug(`${this.serviceSubType} InUse ->`, isInUse);
    this.service.getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.OutletInUse).updateValue(isInUse);
  }

  // public updateVolt(value: number): void {
  //   this.log.debug(`${this.serviceSubType} Volt ->`, value);
  //   this.service
  //     .getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.PowerConsumption.Volt)
  //     .updateValue(value);
  // }

  // public updateAmpere(value: number): void {
  //   this.log.debug(`${this.serviceSubType} Ampere ->`, value);
  //   this.service
  //     .getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.PowerConsumption.Ampere)
  //     .updateValue(value);
  // }

  protected override createService(): Service {
    const service = this.getOrAddService(this.ecoFlowAccessory.config.name, this.serviceSubType);
    this.addCharacteristics(service);
    return service;
  }

  protected abstract setOn(value: boolean, revert: () => void): Promise<void>;

  protected sendOn<TParams>(
    moduleType: number,
    operateType: string,
    params: TParams,
    revert: () => void
  ): Promise<void> {
    return this.ecoFlowAccessory.sendSetCommand(moduleType, operateType, params, revert);
  }

  private addCharacteristics(service: Service): void {
    service.getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.On).onSet(value => {
      const newValue = value as boolean;
      this.setOn(newValue, () => this.updateState(!newValue));
    });

    service.getCharacteristic(this.ecoFlowAccessory.platform.Characteristic.PowerConsumption.Watt).onSet(value => {
      this.log.warn(`${this.serviceSubType} Watt is set ->`, value);
    });

    const characteristic = this.service.getCharacteristic(
      this.ecoFlowAccessory.platform.Characteristic.PowerConsumption.KilowattHour
    );
    if (characteristic) {
      this.service.removeCharacteristic(characteristic);
    }
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
