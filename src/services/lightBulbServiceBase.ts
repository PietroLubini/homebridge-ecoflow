import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic } from 'homebridge';

export abstract class LightBulbServiceBase extends ServiceBase {
  private currentBrightness = 0;
  private brightnessCharacteristic: Characteristic | null = null;

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
      this.processOnSetOn(newValue, () => this.updateState(!newValue));
    });

    this.brightnessCharacteristic = this.addCharacteristic(this.platform.Characteristic.Brightness);
    this.brightnessCharacteristic.onSet(percents => {
      const prevBrightness = this.currentBrightness;
      this.currentBrightness = this.covertPercentsToValue(percents as number, this.maxBrightness);
      this.processOnSetBrightness(this.currentBrightness, () => this.updateBrightness(prevBrightness));
    });

    return [onCharacteristic, this.brightnessCharacteristic];
  }

  public updateState(state: boolean): void {
    this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  }

  public updateBrightness(value: number): void {
    const percents = this.covertValueToPercents(value, this.maxBrightness);
    this.updateCharacteristic(this.platform.Characteristic.Brightness, 'Brightness', percents);
    this.currentBrightness = value;
  }

  protected setBrightness(value: number): void {
    this.brightnessCharacteristic?.setValue(value);
  }

  protected abstract processOnSetOn(value: boolean, revert: () => void): Promise<void>;

  protected abstract processOnSetBrightness(value: number, revert: () => void): Promise<void>;
}
