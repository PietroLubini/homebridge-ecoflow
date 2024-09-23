import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import {
  MqttPowerStreamSetBrightnessMessageParams,
  MqttPowerStreamSetCmdCodeType,
  MqttPowerStreamSetMessageWithParams,
} from '@ecoflow/accessories/powerstream/interfaces/mqttApiPowerStreamContracts';
import { LightBulbServiceBase } from '@ecoflow/services/lightBulbServiceBase';

export class IndicatorService extends LightBulbServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, maxBrightness: number) {
    super(ecoFlowAccessory, maxBrightness, 'Indicator');
  }

  protected override processOnSetOn(state: boolean): Promise<void> {
    this.setBrightness(state ? 100 : 0);
    return Promise.resolve();
  }

  protected override processOnSetBrightness(value: number, revert: () => void): Promise<void> {
    const message: MqttPowerStreamSetMessageWithParams<MqttPowerStreamSetBrightnessMessageParams> = {
      id: 0,
      version: '',
      cmdCode: MqttPowerStreamSetCmdCodeType.WN511_SET_BRIGHTNESS_PACK,
      params: {
        brightness: Math.round(value),
      },
    };
    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
