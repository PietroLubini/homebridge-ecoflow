import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import {
  MqttPowerStreamSetCmdCodeType,
  MqttPowerStreamSetMessageWithParams,
  MqttPowerStreamSetPermanentWattsMessageParams,
} from '@ecoflow/accessories/powerstream/interfaces/mqttApiPowerStreamContracts';
import { FanServiceBase } from '@ecoflow/services/fanServiceBase';

export class PowerDemandService extends FanServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, maxPowerDemand: number) {
    super(ecoFlowAccessory, maxPowerDemand, 'Power Demand');
  }

  protected override processOnSetOn(state: boolean): Promise<void> {
    this.setRotationSpeed(state ? 100 : 0);
    return Promise.resolve();
  }

  protected override processOnSetRotationSpeed(value: number, revert: () => void): Promise<void> {
    const message: MqttPowerStreamSetMessageWithParams<MqttPowerStreamSetPermanentWattsMessageParams> = {
      id: 0,
      version: '',
      cmdCode: MqttPowerStreamSetCmdCodeType.WN511_SET_PERMANENT_WATTS_PACK,
      params: {
        permanentWatts: value,
      },
    };
    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
