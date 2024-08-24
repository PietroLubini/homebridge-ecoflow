import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic } from 'homebridge';

export abstract class LightBulbServiceBase extends ServiceBase {
  private currentBrightness = 0;
  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryBase,
    private readonly maxBrightness: number,
    serviceSubType: string
  ) {
    super(ecoFlowAccessory.platform.Service.Lightbulb, ecoFlowAccessory, serviceSubType);
  }

  protected override addCharacteristics(): Characteristic[] {
    const onCharacteristic = this.addCharacteristic(this.platform.Characteristic.On);
    onCharacteristic.onSet(value => {
      const newValue = value as boolean;
      this.setOn(newValue, () => this.updateState(!newValue));
    });

    const brightnessCharacteristic = this.addCharacteristic(this.platform.Characteristic.Brightness);
    brightnessCharacteristic.onSet(value => {
      const newValue = value as number;
      const prevBrightness = this.currentBrightness;
      this.currentBrightness = this.covertPercentToBrightness(newValue);
      this.setBrightness(newValue, () => this.updateBrightness(prevBrightness));
    });

    return [onCharacteristic, this.addCharacteristic(this.platform.Characteristic.Brightness)];
  }

  public updateState(state: boolean): void {
    this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  }

  public updateBrightness(brightness: number): void {
    const value = this.covertBrightnessToPercent(brightness);
    this.updateCharacteristic(this.platform.Characteristic.Brightness, 'Brightness', value);
    this.currentBrightness = brightness;
  }

  protected abstract setOn(value: boolean, revert: () => void): Promise<void>;

  protected abstract setBrightness(value: number, revert: () => void): Promise<void>;

  protected covertPercentToBrightness(value: number): number {
    return (value * this.maxBrightness) / 100;
  }

  private covertBrightnessToPercent(brightness: number): number {
    return (brightness * 100) / this.maxBrightness;
  }
}
