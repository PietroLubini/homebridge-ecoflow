import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { GlacierAllQuotaData } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  GlacierMqttSetOperateType,
  GlacierMqttSetTemperatureMessageParams,
} from '@ecoflow/accessories/glacier/interfaces/glacierMqttApiContracts';
import { GlacierThermostatFridgeServiceBase } from '@ecoflow/accessories/glacier/services/glacierThermostatFridgeServiceBase';

export class ThermostatFridgeDualLeftZoneService extends GlacierThermostatFridgeServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>) {
    super(ecoFlowAccessory, 'Dual Left Zone');
  }

  protected override processOnSetTargetTemperature(value: number, revert: () => void): Promise<void> {
    return this.sendSetCommand<GlacierMqttSetTemperatureMessageParams>(
      GlacierMqttSetOperateType.Temperature,
      { tmpL: value },
      revert
    );
  }
}
