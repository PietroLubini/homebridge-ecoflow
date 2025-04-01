import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { GlacierAllQuotaData, TemperatureType } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  GlacierMqttSetMessageParams,
  GlacierMqttSetMessageWithParams,
  GlacierMqttSetModuleType,
  GlacierMqttSetOperateType,
  GlacierMqttSetTemperatureUnitMessageParams,
} from '@ecoflow/accessories/glacier/interfaces/glacierMqttApiContracts';
import { TemperatureDisplayUnitsType } from '@ecoflow/characteristics/characteristicContracts';
import { ThermostatFridgeServiceBase } from '@ecoflow/services/thermostatFridgeServiceBase';

export abstract class GlacierThermostatFridgeServiceBase extends ThermostatFridgeServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>, serviceSubType: string) {
    super(ecoFlowAccessory, -25, 10, serviceSubType);
  }

  protected override processOnSetTargetState(): Promise<void> {
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
  }

  protected override processOnSetTemperatureDisplayUnits(
    value: TemperatureDisplayUnitsType,
    revert: () => void
  ): Promise<void> {
    return this.sendSetCommand<GlacierMqttSetTemperatureUnitMessageParams>(
      GlacierMqttSetOperateType.TemperatureUnit,
      { unit: value === TemperatureDisplayUnitsType.Celsius ? TemperatureType.Celsius : TemperatureType.Fahrenheit },
      revert
    );
  }

  protected sendSetCommand<TParams extends GlacierMqttSetMessageParams>(
    operateType: GlacierMqttSetOperateType,
    params: TParams,
    revert: () => void
  ): Promise<void> {
    const message: GlacierMqttSetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      moduleType: GlacierMqttSetModuleType.Default,
      operateType,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
