import { EnableType } from '@ecoflow/accessories/batteries/delta2/interfaces/delta2HttpApiContracts';
import {
  Delta2MqttSetModuleType,
  Delta2MqttSetOnMessageParams,
  Delta2MqttSetOperationType,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2MqttApiContracts';
import { Delta2OutletServiceBase } from '@ecoflow/accessories/batteries/delta2/services/delta2OutletServiceBase';
import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';

export class OutletCarService extends Delta2OutletServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(ecoFlowAccessory, 'CAR', ecoFlowAccessory.config.battery?.additionalCharacteristics);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<Delta2MqttSetOnMessageParams>(
      Delta2MqttSetModuleType.MPPT,
      Delta2MqttSetOperationType.MpptCar,
      { enabled: value ? EnableType.On : EnableType.Off },
      revert
    );
  }
}
