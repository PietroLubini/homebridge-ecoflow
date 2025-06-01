import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Characteristic, CharacteristicValue, Logging, Service, WithUUID } from 'homebridge';

export abstract class ServiceBase {
  protected readonly log: Logging;
  protected readonly platform: EcoFlowHomebridgePlatform;
  protected characteristics: Characteristic[] = [];
  private _service: Service | null = null;
  private isReachable: boolean = true;
  private enabled: boolean = true;

  constructor(
    private readonly serviceType: WithUUID<typeof Service>,
    protected readonly ecoFlowAccessory: EcoFlowAccessoryBase,
    protected readonly serviceSubType?: string
  ) {
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
    if (!this._service) {
      this.log.error('Service is not initialized:', this.constructor.name);
      throw new Error(`Service is not initialized: ${this.constructor.name}`);
    }
    return this._service;
  }

  public updateEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.onDisabled();
    }
  }

  public updateReachability(value: boolean): void {
    this.isReachable = value;
  }

  protected get serviceName(): string {
    return this.ecoFlowAccessory.config.name + (this.serviceSubType ? ` ${this.serviceSubType}` : '');
  }

  protected createService(): Service {
    return this.serviceSubType
      ? this.getOrAddServiceById(this.serviceType, this.serviceName, this.serviceSubType)
      : this.getOrAddService(this.serviceType, this.ecoFlowAccessory.config.name);
  }

  protected abstract addCharacteristics(): Characteristic[];

  protected addCharacteristic(characteristic: WithUUID<{ new (): Characteristic }>): Characteristic {
    return this.service.getCharacteristic(characteristic);
  }

  protected getOrAddService(service: WithUUID<typeof Service>, displayName?: string): Service {
    const result =
      this.ecoFlowAccessory.accessory.getService(service) || this.ecoFlowAccessory.accessory.addService(service, displayName, service.UUID);
    result.displayName = displayName ?? result.displayName;

    return result;
  }

  protected getOrAddServiceById(service: WithUUID<typeof Service>, serviceName: string, serviceSubType: string): Service {
    const result =
      this.ecoFlowAccessory.accessory.getServiceById(service, serviceSubType) ||
      this.ecoFlowAccessory.accessory.addService(service, serviceName, serviceSubType);

    return result;
  }

  protected updateCharacteristic(characteristic: WithUUID<{ new (): Characteristic }>, name: string, value: CharacteristicValue): void {
    const newName = this.serviceSubType !== undefined ? `${this.serviceSubType} ${name}` : name;
    this.log.debug(`${newName} ->`, value);
    this.service.getCharacteristic(characteristic).updateValue(value);
  }

  protected covertPercentsToValue(percents: number, maxValue: number): number {
    return (percents * maxValue) / 100;
  }

  protected covertValueToPercents(value: number, maxValue: number): number {
    return (value * 100) / maxValue;
  }

  protected onDisabled(): void {}

  protected processOnGet<TValue>(value: TValue): TValue {
    this.checkIsReachable();
    return value;
  }

  protected processOnSetVerify(name: string): void {
    this.checkIsReachable();
    this.checkIsEnabled(name);
  }

  protected async processOnSet(process: () => Promise<void>, revert: () => void): Promise<void> {
    try {
      await process();
    } catch (error) {
      this.log.warn('Failed to process onSet. Reverting value...', error);
      setTimeout(() => revert(), 300);
    }
  }

  private checkIsReachable(): void {
    if (!this.isReachable) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  private checkIsEnabled(name: string): void {
    if (!this.enabled) {
      this.log.warn(`[${this.serviceName}] Service is disabled. Setting of "${name}" is disallowed`);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
    }
  }
}
