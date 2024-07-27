import { Characteristic, CharacteristicValue, Service, WithUUID } from 'homebridge';
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
    this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  }

  public updateConsumption(watt: number): void {
    this.updateCharacteristic(this.platform.Characteristic.PowerConsumption.Watt, 'Watt', watt);
    // this.updateCharacteristic(this.platform.Characteristic.PowerConsumption.KilowattHour, 'kWh', watt / 1000);
    this.updateCharacteristic(this.platform.Characteristic.PowerConsumption.Ampere, 'Ampere', watt / 220);
    this.updateCharacteristic(this.platform.Characteristic.PowerConsumption.Volt, 'Volt', 220 + watt / 1000);
    this.updateCharacteristic(this.platform.Characteristic.OutletInUse, 'InUse', watt > 0);
  }

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

  private static addCharacteristic(
    service: Service,
    characteristic: WithUUID<{ new (): Characteristic }>,
    add: boolean = true
  ): Characteristic | null {
    const existingCharacteristic = service.getCharacteristic(characteristic);
    if (existingCharacteristic) {
      service.removeCharacteristic(existingCharacteristic);
    }
    if (add) {
      return service.addCharacteristic(characteristic);
    }
    return null;
  }

  private addCharacteristics(service: Service): void {
    service.getCharacteristic(this.platform.Characteristic.On).onSet(value => {
      const newValue = value as boolean;
      this.setOn(newValue, () => this.updateState(!newValue));
    });

    OutletsServiceBase.addCharacteristic(service, this.platform.Characteristic.PowerConsumption.Watt);
    OutletsServiceBase.addCharacteristic(service, this.platform.Characteristic.PowerConsumption.KilowattHour, false);
    OutletsServiceBase.addCharacteristic(service, this.platform.Characteristic.PowerConsumption.Ampere);
    OutletsServiceBase.addCharacteristic(service, this.platform.Characteristic.PowerConsumption.Volt);
  }

  private getOrAddService(deviceName: string, serviceSubType: string): Service {
    const serviceName = deviceName + ' ' + serviceSubType;
    const service =
      this.ecoFlowAccessory.accessory.getServiceById(this.platform.Service.Outlet, serviceSubType) ||
      this.ecoFlowAccessory.accessory.addService(this.platform.Service.Outlet, serviceName, serviceSubType);

    service.setCharacteristic(this.platform.Characteristic.Name, serviceName);

    return service;
  }

  private updateCharacteristic(
    characteristic: WithUUID<{ new (): Characteristic }>,
    name: string,
    value: CharacteristicValue
  ): void {
    this.log.debug(`${this.serviceSubType} ${name} ->`, value);
    this.service.getCharacteristic(characteristic).updateValue(value);
  }
}
