import { randomInt } from 'crypto';
import { Characteristic, CharacteristicValue, Service, WithUUID } from 'homebridge';
import { EcoFlowAccessory } from '../accessories/ecoFlowAccessory.js';
import { CustomBatteryCharacteristicType as CharacteristicType } from '../config.js';
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
    this.updateCharacteristic(this.platform.Characteristic.OutletInUse, 'InUse', watt > 0);
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.Consumption,
      'Consumption',
      watt,
      CharacteristicType.Consumption
    );
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.TotalConsumption,
      'Total Consumption',
      watt / 1000,
      CharacteristicType.TotalConsumption
    );
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.Current,
      'Current',
      watt / 220,
      CharacteristicType.Current
    );
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.Voltage,
      'Voltage',
      220 + randomInt(10),
      CharacteristicType.Voltage
    );
  }

  protected override createService(): Service {
    return this.getOrAddServiceById(this.platform.Service.Outlet, this.serviceName, this.serviceSubType);
  }

  protected override addCharacteristics(): Characteristic[] {
    const onCharacteristic = this.addCharacteristic(this.platform.Characteristic.On);
    onCharacteristic.onSet(value => {
      const newValue = value as boolean;
      this.setOn(newValue, () => this.updateState(!newValue));
    });

    const characteristics = [
      this.addCharacteristic(this.platform.Characteristic.OutletInUse),
      onCharacteristic,
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.PowerConsumption.Consumption,
        CharacteristicType.Consumption
      ),
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.PowerConsumption.TotalConsumption,
        CharacteristicType.TotalConsumption
      ),
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.PowerConsumption.Current,
        CharacteristicType.Current
      ),
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.PowerConsumption.Voltage,
        CharacteristicType.Voltage
      ),
    ];
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return characteristics.filter(characteristic => characteristic !== null);
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

  protected override updateCharacteristic(
    characteristic: WithUUID<{ new (): Characteristic }>,
    name: string,
    value: CharacteristicValue
  ): void {
    super.updateCharacteristic(characteristic, `${this.serviceSubType} ${name}`, value);
  }

  private tryAddCustomCharacteristic(
    characteristic: WithUUID<{ new (): Characteristic }>,
    characteristicType: CharacteristicType
  ): Characteristic | null {
    if (this.ecoFlowAccessory.config.battery?.customCharacteristics.includes(characteristicType)) {
      return this.addCharacteristic(characteristic);
    }
    return null;
  }

  private updateCustomCharacteristic(
    characteristic: WithUUID<{ new (): Characteristic }>,
    name: string,
    value: CharacteristicValue,
    characteristicType: CharacteristicType
  ): void {
    if (this.ecoFlowAccessory.config.battery?.customCharacteristics.includes(characteristicType)) {
      super.updateCharacteristic(characteristic, name, value);
    }
  }

  private get serviceName(): string {
    return `${this.ecoFlowAccessory.config.name} ${this.serviceSubType}`;
  }
}
