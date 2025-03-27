import {
  Delta2MqttSetMessageParams,
  Delta2MqttSetMessageWithParams,
  Delta2MqttSetModuleType,
  Delta2MqttSetOperationType,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2MqttApiContracts';
import { OutletBatteryServiceBase } from '@ecoflow/services/outletBatteryServiceBase';

export abstract class Delta2OutletServiceBase extends OutletBatteryServiceBase {
  protected sendOn<TParams extends Delta2MqttSetMessageParams>(
    moduleType: Delta2MqttSetModuleType,
    operateType: Delta2MqttSetOperationType,
    params: TParams,
    revert: () => void
  ): Promise<void> {
    const message: Delta2MqttSetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      moduleType,
      operateType,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
