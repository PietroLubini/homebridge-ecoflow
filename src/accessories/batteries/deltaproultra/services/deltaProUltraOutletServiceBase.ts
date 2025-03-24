import {
  DeltaProUltraMqttSetCmdCodeType,
  DeltaProUltraMqttSetMessageParams,
  DeltaProUltraMqttSetMessageWithParams,
} from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraMqttApiContracts';
import { BatteryOutletServiceBase } from '@ecoflow/services/batteryOutletServiceBase';

export abstract class DeltaProUltraOutletServiceBase extends BatteryOutletServiceBase {
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
