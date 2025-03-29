import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import {
  PowerStreamMqttSetBrightnessMessageParams,
  PowerStreamMqttSetCmdCodeType,
  PowerStreamMqttSetMessageWithParams,
} from '@ecoflow/accessories/powerstream/interfaces/powerStreamMqttApiContracts';
import { LightBulbServiceBase } from '@ecoflow/services/lightBulbServiceBase';

export class BrightnessService extends LightBulbServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, maxBrightness: number) {
    super(ecoFlowAccessory, maxBrightness, 'Brightness');
  }

  protected override processOnSetOn(state: boolean): Promise<void> {
    this.setBrightness(state ? 100 : 0);
    return Promise.resolve();
  }

  protected override processOnSetBrightness(value: number, revert: () => void): Promise<void> {
    const message: PowerStreamMqttSetMessageWithParams<PowerStreamMqttSetBrightnessMessageParams> = {
      id: 0,
      version: '',
      cmdCode: PowerStreamMqttSetCmdCodeType.WN511_SET_BRIGHTNESS_PACK,
      params: {
        brightness: Math.round(value),
      },
    };
    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
