import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic } from 'homebridge';

export abstract class LightBulbServiceBase extends ServiceBase {
  private state: boolean = false;
  private brightnessPercents: number = 0;
  private brightness: number = 0;
  private brightnessCharacteristic: Characteristic | null = null;

  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryBase,
    private readonly maxBrightness: number,
    serviceSubType: string
  ) {
    super(ecoFlowAccessory.platform.Service.Lightbulb, ecoFlowAccessory, serviceSubType);
  }

  protected override addCharacteristics(): Characteristic[] {
    const onCharacteristic = this.addCharacteristic(this.platform.Characteristic.On)
      .onGet(() => this.processOnGet(this.state))
      .onSet(value => {
        const revert = () => this.updateState(!value);
        this.processOnSet(
          this.platform.Characteristic.On.name,
          async () => {
            this.state = value as boolean;
            await this.processOnSetOn(this.state, revert);
          },
          revert
        );
      });

    this.brightnessCharacteristic = this.addCharacteristic(this.platform.Characteristic.Brightness)
      .onGet(() => this.processOnGet(this.brightnessPercents))
      .onSet(percents => {
        const prevBrightness = this.brightness;
        const revert = () => this.updateBrightness(prevBrightness);
        this.processOnSet(
          this.platform.Characteristic.Brightness.name,
          async () => {
            this.brightnessPercents = percents as number;
            this.brightness = this.covertPercentsToValue(this.brightnessPercents, this.maxBrightness);
            await this.processOnSetBrightness(this.brightness, revert);
          },
          revert
        );
      });

    return [onCharacteristic, this.brightnessCharacteristic];
  }

  public updateState(state: boolean): void {
    this.state = state;
    this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  }

  public updateBrightness(value: number): void {
    this.brightnessPercents = this.covertValueToPercents(value, this.maxBrightness);
    this.updateCharacteristic(this.platform.Characteristic.Brightness, 'Brightness', this.brightnessPercents);
    this.brightness = value;
  }

  protected setBrightness(value: number): void {
    this.brightnessCharacteristic?.setValue(value);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected processOnSetOn(value: boolean, revert: () => void): Promise<void> {
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected processOnSetBrightness(value: number, revert: () => void): Promise<void> {
    return Promise.resolve();
  }
}
