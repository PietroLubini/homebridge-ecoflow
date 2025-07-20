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
      .onSet(value => {
        this.processOnSetVerify(this.platform.Characteristic.On.name);
        const revert = () => this.updateState(!value);
        this.processOnSet(async () => {
          this.state = value as boolean;
          await this.processOnSetOn(this.state, revert);
        }, revert);
      });

    this.rotationSpeedCharacteristic = this.addCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onGet(() => this.processOnGet(this.rotationSpeedPercents))
      .onSet(percents => {
        this.processOnSetVerify(this.platform.Characteristic.RotationSpeed.name);
        const prevRotationSpeed = this.rotationSpeed;
        const revert = () => this.updateRotationSpeed(prevRotationSpeed);
        this.processOnSet(async () => {
          this.rotationSpeedPercents = percents as number;
          this.rotationSpeed = this.covertPercentsToValue(this.rotationSpeedPercents, this.maxRotationSpeed);
          await this.processOnSetRotationSpeed(this.rotationSpeed, revert);
        }, revert);
      });

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected processOnSetOn(value: boolean, revert: () => void): Promise<void> {
    /* istanbul ignore next */
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected processOnSetRotationSpeed(value: number, revert: () => void): Promise<void> {
    /* istanbul ignore next */
    return Promise.resolve();
  }
}
