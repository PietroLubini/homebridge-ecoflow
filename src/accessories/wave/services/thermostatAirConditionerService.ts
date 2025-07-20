import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { WaveAllQuotaData, WaveMainModeType, WavePowerModeType } from '@ecoflow/accessories/wave/interfaces/waveHttpApiContracts';
import {
  WaveMqttSetMainModeMessageParams,
  WaveMqttSetMessageParams,
  WaveMqttSetMessageWithParams,
  WaveMqttSetModuleType,
  WaveMqttSetOperateType,
  WaveMqttSetPowerModeMessageParams,
  WaveMqttSetTemperatureMessageParams,
  WaveMqttSetTemperatureUnitMessageParams,
} from '@ecoflow/accessories/wave/interfaces/waveMqttApiContracts';
import { TargetHeatingCoolingStateType, TemperatureDisplayUnitsType } from '@ecoflow/characteristics/characteristicContracts';
import { ThermostatAirConditionerServiceBase } from '@ecoflow/services/thermostatAirConditionerServiceBase';

export class ThermostatAirConditionerService extends ThermostatAirConditionerServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<WaveAllQuotaData>) {
    super(ecoFlowAccessory, 16, 30);
  }

  protected override processOnSetTargetTemperature(value: number, revert: () => void): Promise<void> {
    return this.sendSetCommand<WaveMqttSetTemperatureMessageParams>(WaveMqttSetOperateType.SetTemperature, { setTemp: value }, revert);
  }

  protected override async processOnSetTargetState(value: TargetHeatingCoolingStateType, revert: () => void): Promise<void> {
    if (value === TargetHeatingCoolingStateType.Off) {
      return this.sendSetCommand<WaveMqttSetPowerModeMessageParams>(WaveMqttSetOperateType.PowerMode, { powerMode: WavePowerModeType.Off }, revert);
    }
    const mainMode = this.convertCoolingHeatingStateToMainMode(value);
    await this.sendSetCommand<WaveMqttSetPowerModeMessageParams>(WaveMqttSetOperateType.PowerMode, { powerMode: WavePowerModeType.On }, revert);
    await this.sendSetCommand<WaveMqttSetMainModeMessageParams>(WaveMqttSetOperateType.MainMode, { mainMode }, revert);
  }

  protected override processOnSetTemperatureDisplayUnits(value: TemperatureDisplayUnitsType, revert: () => void): Promise<void> {
    return this.sendSetCommand<WaveMqttSetTemperatureUnitMessageParams>(WaveMqttSetOperateType.TemperatureUnit, { mode: value }, revert);
  }

  protected sendSetCommand<TParams extends WaveMqttSetMessageParams>(
    operateType: WaveMqttSetOperateType,
    params: TParams,
    revert: () => void
  ): Promise<void> {
    const message: WaveMqttSetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      moduleType: WaveMqttSetModuleType.Default,
      operateType,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }

  private convertCoolingHeatingStateToMainMode(value: TargetHeatingCoolingStateType): WaveMainModeType {
    switch (value) {
      case TargetHeatingCoolingStateType.Heat:
        return WaveMainModeType.Heat;
      case TargetHeatingCoolingStateType.Auto:
        return WaveMainModeType.Fan;
      default:
        return WaveMainModeType.Cool;
    }
  }
}
