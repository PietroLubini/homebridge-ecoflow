import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import {
  MqttPowerStreamSetBrightnessMessageParams,
  MqttPowerStreamSetCmdCodeType,
  MqttPowerStreamSetMessageWithParams,
} from '@ecoflow/accessories/powerstream/interfaces/mqttApiPowerStreamContracts';
import { LightBulbServiceBase } from '@ecoflow/services/lightBulbServiceBase';

export class LightBulbInvService extends LightBulbServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(ecoFlowAccessory, 1023, 'INV');
  }

  protected override setOn(): Promise<void> {
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
  }

  protected override setBrightness(value: number, revert: () => void): Promise<void> {
    const message: MqttPowerStreamSetMessageWithParams<MqttPowerStreamSetBrightnessMessageParams> = {
      id: 0,
      version: '',
      cmdCode: MqttPowerStreamSetCmdCodeType.WN511_SET_BRIGHTNESS_PACK,
      params: {
        brightness: this.covertPercentToBrightness(value),
      },
    };
    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
