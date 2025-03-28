import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { GlacierAllQuotaData } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  GlacierMqttSetOperateType,
  GlacierMqttSetTemperatureMessageParams,
} from '@ecoflow/accessories/glacier/interfaces/glacierMqttApiContracts';
import { GlacierHeaterCoolerFridgeServiceBase } from '@ecoflow/accessories/glacier/services/glacierHeaterCoolerFridgeServiceBase';

export class HeaterCoolerFridgeDualRightZoneService extends GlacierHeaterCoolerFridgeServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>) {
    super(ecoFlowAccessory, 'Dual Right Zone HC');
  }

  protected override processOnSetTargetTemperature(value: number, revert: () => void): Promise<void> {
    return this.sendSetCommand<GlacierMqttSetTemperatureMessageParams>(
      GlacierMqttSetOperateType.Temperature,
      { tmpR: value },
      revert
    );
  }
}
