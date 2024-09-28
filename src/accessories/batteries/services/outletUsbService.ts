import {
  MqttBatterySetOnMessageParams,
  MqttBatterySetOperationType,
} from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { OutletBatteryServiceBase } from '@ecoflow/accessories/batteries/services/outletBatteryServiceBase';
import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';

export class OutletUsbService extends OutletBatteryServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, batteryStatusProvider: BatteryStatusProvider) {
    super(ecoFlowAccessory, batteryStatusProvider, 'USB', ecoFlowAccessory.config.battery?.additionalCharacteristics);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<MqttBatterySetOnMessageParams>(
      1,
      MqttBatterySetOperationType.DcOutCfg,
      { enabled: Number(value) },
      revert
    );
  }
}
