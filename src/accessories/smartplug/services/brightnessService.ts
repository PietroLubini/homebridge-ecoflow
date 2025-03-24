import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import {
  SmartPlugMqttSetBrightnessMessageParams,
  SmartPlugMqttSetCmdCodeType,
  SmartPlugMqttSetMessageWithParams,
} from '@ecoflow/accessories/smartplug/interfaces/smartPlugMqttApiContracts';
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
    const message: SmartPlugMqttSetMessageWithParams<SmartPlugMqttSetBrightnessMessageParams> = {
      id: 0,
      version: '',
      cmdCode: SmartPlugMqttSetCmdCodeType.Brightness,
      params: {
        brightness: Math.round(value),
      },
    };
    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
