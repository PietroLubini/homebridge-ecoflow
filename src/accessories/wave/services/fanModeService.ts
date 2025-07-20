import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { WaveFanSpeedType, WaveMainModeType, WavePowerModeType } from '@ecoflow/accessories/wave/interfaces/waveHttpApiContracts';
import {
  WaveMqttSetFanSpeedMessageParams,
  WaveMqttSetMainModeMessageParams,
  WaveMqttSetMessageWithParams,
  WaveMqttSetModuleType,
  WaveMqttSetOperateType,
  WaveMqttSetPowerModeMessageParams,
} from '@ecoflow/accessories/wave/interfaces/waveMqttApiContracts';
import { MqttSetMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { FanPositionedServiceBase } from '@ecoflow/services/fanPositionedService';

export class FanModeService extends FanPositionedServiceBase<WaveFanSpeedType, typeof WaveFanSpeedType> {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(ecoFlowAccessory, 'Fan Mode', WaveFanSpeedType);
  }

  protected override processOnSetOn(value: boolean, revert: () => void): Promise<void> {
    let message: MqttSetMessage;
    if (value) {
      const mainModeMessage: WaveMqttSetMessageWithParams<WaveMqttSetMainModeMessageParams> = {
        id: 0,
        version: '',
        moduleType: WaveMqttSetModuleType.Default,
        operateType: WaveMqttSetOperateType.MainMode,
        params: {
          mainMode: WaveMainModeType.Fan,
        },
      };
      message = mainModeMessage;
    } else {
      const powerModeMessage: WaveMqttSetMessageWithParams<WaveMqttSetPowerModeMessageParams> = {
        id: 0,
        version: '',
        moduleType: WaveMqttSetModuleType.Default,
        operateType: WaveMqttSetOperateType.PowerMode,
        params: {
          powerMode: WavePowerModeType.Off,
        },
      };
      message = powerModeMessage;
    }

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }

  protected processOnSetPositionedRotationSpeed(value: WaveFanSpeedType, revert: () => void): Promise<void> {
    const message: WaveMqttSetMessageWithParams<WaveMqttSetFanSpeedMessageParams> = {
      id: 0,
      version: '',
      moduleType: WaveMqttSetModuleType.Default,
      operateType: WaveMqttSetOperateType.FanSpeedMode,
      params: {
        fanValue: value,
      },
    };
    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
