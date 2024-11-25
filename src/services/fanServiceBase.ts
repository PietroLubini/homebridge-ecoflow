import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic } from 'homebridge';

export abstract class FanServiceBase extends ServiceBase {
  private currentRotationSpeed = 0;
  private rotationSpeedCharacteristic: Characteristic | null = null;

  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryBase,
    private readonly maxRotationSpeed: number,
    serviceSubType: string
  ) {
    super(ecoFlowAccessory.platform.Service.Fan, ecoFlowAccessory, serviceSubType);
  }

  protected override addCharacteristics(): Characteristic[] {
    const onCharacteristic = this.addCharacteristic(this.platform.Characteristic.On);
    onCharacteristic.onSet(value => {
      const newValue = value as boolean;
      this.processOnSetOn(newValue, () => this.updateState(!newValue));
    });

    this.rotationSpeedCharacteristic = this.addCharacteristic(this.platform.Characteristic.RotationSpeed);
    this.rotationSpeedCharacteristic.onSet(percents => {
      const prevRotationSpeed = this.currentRotationSpeed;
      this.currentRotationSpeed = this.covertPercentsToValue(percents as number, this.maxRotationSpeed);
      this.processOnSetRotationSpeed(this.currentRotationSpeed, () => this.updateRotationSpeed(prevRotationSpeed));
    });

    return [onCharacteristic, this.rotationSpeedCharacteristic];
  }

  public updateState(state: boolean): void {
    this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  }

  public updateRotationSpeed(value: number): void {
    const percents = this.covertValueToPercents(value, this.maxRotationSpeed);
    this.updateCharacteristic(this.platform.Characteristic.RotationSpeed, 'RotationSpeed', percents);
    this.currentRotationSpeed = value;
  }

  protected setRotationSpeed(value: number): void {
    this.rotationSpeedCharacteristic?.setValue(value);
  }

  protected abstract processOnSetOn(value: boolean, revert: () => void): Promise<void>;

  protected abstract processOnSetRotationSpeed(value: number, revert: () => void): Promise<void>;
}
