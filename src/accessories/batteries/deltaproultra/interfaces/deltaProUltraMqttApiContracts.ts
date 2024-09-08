import { AcOutFrequencyType } from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraHttpApiContracts';
import { AcXBoostType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import {
  MqttQuotaMessage,
  MqttQuotaMessageWithData,
  MqttSetMessage,
  MqttSetMessageWithParams,
} from '@ecoflow/apis/interfaces/mqttApiContracts';

export interface DeltaProUltraMqttQuotaMessage extends MqttQuotaMessage {}

export interface DeltaProUltraMqttQuotaMessageWithParams<TParams>
  extends MqttQuotaMessageWithData<TParams>,
    DeltaProUltraMqttQuotaMessage {}

export enum DeltaProUltraMqttSetCmdCodeType {
  // YJ751_PD_AC_SWITCH_SET = 'YJ751_PD_AC_SWITCH_SET', // TBD: verify that it exists in API
  YJ751_PD_DC_SWITCH_SET = 'YJ751_PD_DC_SWITCH_SET',
  YJ751_PD_AC_DSG_SET = 'YJ751_PD_AC_DSG_SET',
}

export interface DeltaProUltraMqttSetMessage extends MqttSetMessage {
  cmdCode: DeltaProUltraMqttSetCmdCodeType;
}

export interface DeltaProUltraMqttSetMessageParams {}

export interface DeltaProUltraMqttSetMessageWithParams<TParams extends DeltaProUltraMqttSetMessageParams>
  extends MqttSetMessageWithParams<TParams>,
    DeltaProUltraMqttSetMessage {}

export interface DeltaProMqttSetOnMessageParams extends DeltaProUltraMqttSetMessageParams {
  enabled: number;
}

export interface DeltaProUltraMqttSetOnMessageParams extends DeltaProUltraMqttSetMessageParams {
  enabled: number;
}

export interface DeltaProUltraMqttSetXBoostMessageParams extends DeltaProUltraMqttSetMessageParams {
  xboost: AcXBoostType;
  outFreq: AcOutFrequencyType;
}
