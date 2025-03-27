import {
  DeltaProMqttSetMessageParams,
  DeltaProMqttSetMessageWithParams,
} from '@ecoflow/accessories/batteries/deltapro/interfaces/deltaProMqttApiContracts';
import { OutletBatteryServiceBase } from '@ecoflow/services/outletBatteryServiceBase';

export abstract class DeltaProOutletServiceBase extends OutletBatteryServiceBase {
  protected sendOn<TParams extends DeltaProMqttSetMessageParams>(params: TParams, revert: () => void): Promise<void> {
    const message: DeltaProMqttSetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      operateType: 'TCP',
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
