import { DeltaProMqttSetOnMessageParams } from '@ecoflow/accessories/batteries/deltapro/interfaces/deltaProMqttApiContracts';
import { DeltaProOutletServiceBase } from '@ecoflow/accessories/batteries/deltapro/services/deltaProOutletServiceBase';
import { EnableType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';

export class OutletCarService extends DeltaProOutletServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, batteryStatusProvider: BatteryStatusProvider) {
    super(ecoFlowAccessory, batteryStatusProvider, 'CAR', ecoFlowAccessory.config.battery?.additionalCharacteristics);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<DeltaProMqttSetOnMessageParams>(
      {
        cmdSet: 32,
        id: 81,
        enabled: value ? EnableType.On : EnableType.Off,
      },
      revert
    );
  }
}
