import {
  DeltaPro3MqttSetMessageParams,
  DeltaPro3MqttSetMessageWithParams,
} from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3MqttApiContracts';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';

export abstract class DeltaPro3OutletServiceBase extends OutletServiceBase {
  protected sendOn<TParams extends DeltaPro3MqttSetMessageParams>(params: TParams, revert: () => void): Promise<void> {
    const message: DeltaPro3MqttSetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      sn: this.ecoFlowAccessory.config.serialNumber,
      cmdId: 17,
      dirDest: 1,
      dirSrc: 1,
      cmdFunc: 254,
      dest: 2,
      needAck: true,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
