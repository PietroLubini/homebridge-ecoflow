import {
  Delta2MqttSetModuleType,
  Delta2MqttSetOperationType,
  MqttDelta2SetMessageWithParams,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2MqttApiContracts';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';

export abstract class Delta2OutletServiceBase extends OutletServiceBase {
  protected sendOn<TParams>(
    moduleType: Delta2MqttSetModuleType,
    operateType: Delta2MqttSetOperationType,
    params: TParams,
    revert: () => void
  ): Promise<void> {
    const message: MqttDelta2SetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      moduleType,
      operateType,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
