import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import {
  PowerStreamMqttSetCmdCodeType,
  PowerStreamMqttSetMessageWithParams,
  PowerStreamMqttSetPermanentWattsMessageParams,
} from '@ecoflow/accessories/powerstream/interfaces/powerStreamMqttApiContracts';
import { FanServiceBase } from '@ecoflow/services/fanServiceBase';

export class PowerDemandService extends FanServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, maxPowerDemand: number) {
    super(ecoFlowAccessory, maxPowerDemand, 'Power Demand');
  }

  protected override processOnSetOn(state: boolean): Promise<void> {
    this.setRotationSpeed(state ? 100 : 0);
    return Promise.resolve();
  }

  protected override async processOnSetRotationSpeed(value: number, revert: () => void): Promise<void> {
    const message: PowerStreamMqttSetMessageWithParams<PowerStreamMqttSetPermanentWattsMessageParams> = {
      id: 0,
      version: '',
      cmdCode: PowerStreamMqttSetCmdCodeType.PowerDemand,
      params: {
        permanentWatts: value,
      },
    };
    await this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
