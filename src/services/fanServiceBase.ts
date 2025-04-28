import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic } from 'homebridge';

export abstract class FanServiceBase extends ServiceBase {
  private state: boolean = false;
  private rotationSpeedPercents: number = 0;
  private rotationSpeed = 0;
  private rotationSpeedCharacteristic: Characteristic | null = null;

  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryBase,
    private readonly maxRotationSpeed: number,
    serviceSubType: string
  ) {
    super(ecoFlowAccessory.platform.Service.Fan, ecoFlowAccessory, serviceSubType);
  }

  protected override addCharacteristics(): Characteristic[] {
    const onCharacteristic = this.addCharacteristic(this.platform.Characteristic.On)
      .onGet(() => this.processOnGet(this.state))
      .onSet(value =>
        this.processOnSet(this.platform.Characteristic.On.name, () => {
          this.state = value as boolean;
          this.processOnSetOn(this.state, () => this.updateState(!this.state));
        })
      );

    this.rotationSpeedCharacteristic = this.addCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onGet(() => this.processOnGet(this.rotationSpeedPercents))
      .onSet(percents =>
        this.processOnSet(this.platform.Characteristic.RotationSpeed.name, () => {
          this.rotationSpeedPercents = percents as number;
          const prevRotationSpeed = this.rotationSpeed;
          this.rotationSpeed = this.covertPercentsToValue(this.rotationSpeedPercents, this.maxRotationSpeed);
          this.processOnSetRotationSpeed(this.rotationSpeed, () => this.updateRotationSpeed(prevRotationSpeed));
        })
      );

    return [onCharacteristic, this.rotationSpeedCharacteristic];
  }

  public updateState(state: boolean): void {
    this.state = state;
    this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  }

  public updateRotationSpeed(value: number): void {
    this.rotationSpeedPercents = this.covertValueToPercents(value, this.maxRotationSpeed);
    this.updateCharacteristic(this.platform.Characteristic.RotationSpeed, 'RotationSpeed', this.rotationSpeedPercents);
    this.rotationSpeed = value;
  }

  protected setRotationSpeed(value: number): void {
    this.rotationSpeedCharacteristic?.setValue(value);
  }

  protected abstract processOnSetOn(value: boolean, revert: () => void): Promise<void>;

  protected abstract processOnSetRotationSpeed(value: number, revert: () => void): Promise<void>;
}
