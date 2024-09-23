import {
  MqttBatterySetMessageWithParams,
  MqttBatterySetOperationType,
} from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';

export abstract class OutletBatteryServiceBase extends OutletServiceBase {
  protected sendOn<TParams>(
    moduleType: number,
    operateType: MqttBatterySetOperationType,
    params: TParams,
    revert: () => void
  ): Promise<void> {
    const message: MqttBatterySetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      moduleType,
      operateType,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
