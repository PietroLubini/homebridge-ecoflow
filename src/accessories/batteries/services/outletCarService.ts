import {
  MqttBatterySetModuleType,
  MqttBatterySetOnMessageParams,
  MqttBatterySetOperationType,
} from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { OutletBatteryServiceBase } from '@ecoflow/accessories/batteries/services/outletBatteryServiceBase';
import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';

export class OutletCarService extends OutletBatteryServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(ecoFlowAccessory, 'CAR', ecoFlowAccessory.config.battery?.additionalCharacteristics);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<MqttBatterySetOnMessageParams>(
      MqttBatterySetModuleType.MPPT,
      MqttBatterySetOperationType.MpptCar,
      {
        enabled: Number(value),
      },
      revert
    );
  }
}
