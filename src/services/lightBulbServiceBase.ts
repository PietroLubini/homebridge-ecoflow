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
    brightnessCharacteristic.onSet(percents => {
      const prevBrightness = this.currentBrightness;
      this.currentBrightness = this.covertPercentsToValue(percents as number, this.maxBrightness);
      this.setBrightness(this.currentBrightness, () => this.updateBrightness(prevBrightness));
    });

    return [onCharacteristic, brightnessCharacteristic];
  }

  public updateState(state: boolean): void {
    this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  }

  public updateBrightness(value: number): void {
    const percents = this.covertValueToPercents(value, this.maxBrightness);
    this.updateCharacteristic(this.platform.Characteristic.Brightness, 'Brightness', percents);
    this.currentBrightness = value;
  }

  protected abstract setOn(value: boolean, revert: () => void): Promise<void>;

  protected abstract setBrightness(value: number, revert: () => void): Promise<void>;
}
