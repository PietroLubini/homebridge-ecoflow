import { EcoFlowAccessory } from '@ecoflow/accessories/ecoFlowAccessory';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic, CharacteristicValue, Logging, Service, WithUUID } from 'homebridge';

export abstract class ServiceBase {
  protected readonly log: Logging;
  protected readonly platform: EcoFlowHomebridgePlatform;
  protected characteristics: Characteristic[] = [];
  private _service: Service | null = null;

  constructor(protected readonly ecoFlowAccessory: EcoFlowAccessory) {
    this.log = ecoFlowAccessory.log;
    this.platform = ecoFlowAccessory.platform;
  }

  public initialize(): void {
    this._service = this.createService();
    this.characteristics = this.addCharacteristics();
    this.characteristics.push(this.addCharacteristic(this.platform.Characteristic.Name));
  }

  public cleanupCharacteristics(): void {
    this.service.characteristics
      .filter(characteristic => !this.characteristics.includes(characteristic))
      .forEach(characteristic => {
        this.log.warn(`[${this.service.displayName}] Removing obsolete characteristic:`, characteristic.displayName);
        this.service.removeCharacteristic(characteristic);
      });
  }

  // Getter for service
  public get service(): Service {
    return this._service!;
  }

  protected abstract createService(): Service;

  protected abstract addCharacteristics(): Characteristic[];

  protected addCharacteristic(characteristic: WithUUID<{ new (): Characteristic }>): Characteristic {
    return this.service.getCharacteristic(characteristic);
  }

  protected getOrAddService(service: WithUUID<typeof Service>, displayName?: string): Service {
    const result =
      this.ecoFlowAccessory.accessory.getService(service) ||
      this.ecoFlowAccessory.accessory.addService(service, displayName, service.UUID);
    result.displayName = displayName ?? result.displayName;

    return result;
  }

  protected getOrAddServiceById(
    service: WithUUID<typeof Service>,
    serviceName: string,
    serviceSubType: string
  ): Service {
    const result =
      this.ecoFlowAccessory.accessory.getServiceById(service, serviceSubType) ||
      this.ecoFlowAccessory.accessory.addService(service, serviceName, serviceSubType);

    return result;
  }

  protected updateCharacteristic(
    characteristic: WithUUID<{ new (): Characteristic }>,
    name: string,
    value: CharacteristicValue
  ): void {
    this.log.debug(`${name} ->`, value);
    this.service.getCharacteristic(characteristic).updateValue(value);
  }
}
