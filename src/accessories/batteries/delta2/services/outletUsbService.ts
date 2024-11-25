import {
  Delta2MqttSetModuleType,
  Delta2MqttSetOnMessageParams,
  Delta2MqttSetOperationType,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2MqttApiContracts';
import { Delta2OutletServiceBase } from '@ecoflow/accessories/batteries/delta2/services/delta2OutletServiceBase';
import { EnableType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';

export class OutletUsbService extends Delta2OutletServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(ecoFlowAccessory, 'USB', ecoFlowAccessory.config.battery?.additionalCharacteristics);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<Delta2MqttSetOnMessageParams>(
      Delta2MqttSetModuleType.PD,
      Delta2MqttSetOperationType.DcOutCfg,
      { enabled: value ? EnableType.On : EnableType.Off },
      revert
    );
  }
}
