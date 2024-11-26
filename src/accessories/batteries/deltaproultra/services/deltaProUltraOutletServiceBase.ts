import {
  DeltaProUltraMqttSetCmdCodeType,
  DeltaProUltraMqttSetMessageParams,
  DeltaProUltraMqttSetMessageWithParams,
} from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraMqttApiContracts';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';

export abstract class DeltaProUltraOutletServiceBase extends OutletServiceBase {
  protected sendOn<TParams extends DeltaProUltraMqttSetMessageParams>(
    cmdCode: DeltaProUltraMqttSetCmdCodeType,
    params: TParams,
    revert: () => void
  ): Promise<void> {
    const message: DeltaProUltraMqttSetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      cmdCode,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
