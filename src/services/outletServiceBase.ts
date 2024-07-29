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

  public updateOutputConsumption(watt: number): void {
    this.updateCharacteristic(this.platform.Characteristic.OutletInUse, 'InUse', watt > 0);
    this.updateCustomCharacteristic(
      this.platform.Characteristic.EvePowerConsumption.OutputConsumptionWatts,
      'Output Consumption, W',
      watt,
      CharacteristicType.OutputConsumptionInWatts
    );
  }

  public updateInputConsumption(watt: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.InputConsumptionWatts,
      'Input Consumption, W',
      watt,
      CharacteristicType.InputConsumptionInWatts
    );
  }

  public updateBatteryLevel(batteryLevel: number): void {
    this.service.getCharacteristic(this.platform.Characteristic.Battery.BatteryLevel).updateValue(batteryLevel);
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
        this.platform.Characteristic.PowerConsumption.InputConsumptionWatts,
        CharacteristicType.InputConsumptionInWatts
      ),
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.EvePowerConsumption.OutputConsumptionWatts,
        CharacteristicType.OutputConsumptionInWatts
      ),
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.Battery.BatteryLevel,
        CharacteristicType.BatteryLevel
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
