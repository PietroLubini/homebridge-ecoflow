import {
  MqttBatterySetOnMessageParams,
  MqttBatterySetOperationType,
} from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { OutletBatteryServiceBase } from '@ecoflow/accessories/batteries/services/outletBatteryServiceBase';
import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';

export class OutletUsbService extends OutletBatteryServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(ecoFlowAccessory, 'USB', ecoFlowAccessory.config.battery?.additionalCharacteristics);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<MqttBatterySetOnMessageParams>(
      1,
      MqttBatterySetOperationType.DcChgCfg,
      { enabled: Number(value) },
      revert
    );
  }
}
