import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import {
  PowerStreamMqttSetBrightnessMessageParams,
  PowerStreamMqttSetCmdCodeType,
  PowerStreamMqttSetMessageWithParams,
} from '@ecoflow/accessories/powerstream/interfaces/powerStreamMqttApiContracts';
import { LightBulbServiceBase } from '@ecoflow/services/lightBulbServiceBase';

export class IndicatorService extends LightBulbServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, maxBrightness: number) {
    super(ecoFlowAccessory, maxBrightness, 'Indicator');
  }

  protected override setOn(): Promise<void> {
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
  }

  protected override setBrightness(value: number, revert: () => void): Promise<void> {
    const message: PowerStreamMqttSetMessageWithParams<PowerStreamMqttSetBrightnessMessageParams> = {
      id: 0,
      version: '',
      cmdCode: PowerStreamMqttSetCmdCodeType.WN511_SET_BRIGHTNESS_PACK,
      params: {
        brightness: value,
      },
    };
    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
