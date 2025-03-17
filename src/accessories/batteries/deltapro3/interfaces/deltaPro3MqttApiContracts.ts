import { DeltaPro3AcEnableType } from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3HttpApiContracts';
import {
  MqttQuotaMessage,
  MqttQuotaMessageWithData,
  MqttSetMessage,
  MqttSetMessageWithParams,
  MqttSetReplyMessageData,
  MqttSetReplyMessageWithData,
} from '@ecoflow/apis/interfaces/mqttApiContracts';

export interface DeltaPro3MqttQuotaMessage extends MqttQuotaMessage {}

export interface DeltaPro3MqttQuotaMessageWithParams<TParams>
  extends MqttQuotaMessageWithData<TParams>,
    DeltaPro3MqttQuotaMessage {}

export type DeltaPro3MqttSetCmdIdType = 17;
export type DeltaPro3MqttSetDirType = 1;
export type DeltaPro3MqttSetCmdFuncType = 254;
export type DeltaPro3MqttSetDestType = 2;
export type DeltaPro3MqttSetAckType = true;

export interface DeltaPro3MqttSetMessage extends MqttSetMessage {
  sn: string;
  cmdId: DeltaPro3MqttSetCmdIdType;
  dirDest: DeltaPro3MqttSetDirType;
  dirSrc: DeltaPro3MqttSetDirType;
  cmdFunc: DeltaPro3MqttSetCmdFuncType;
  dest: DeltaPro3MqttSetDestType;
  needAck: DeltaPro3MqttSetAckType;
}

export interface DeltaPro3MqttSetMessageParams {}

export interface DeltaPro3MqttSetMessageWithParams<TParams extends DeltaPro3MqttSetMessageParams>
  extends MqttSetMessageWithParams<TParams>,
    DeltaPro3MqttSetMessage {}

export interface DeltaPro3MqttSetAcHvMessageParams extends DeltaPro3MqttSetMessageParams {
  cfgHvAcOutOpen: boolean;
}

export interface DeltaPro3MqttSetAcLvMessageParams extends DeltaPro3MqttSetMessageParams {
  cfgLvAcOutOpen: boolean;
}

export interface DeltaPro3MqttSetDc12vMessageParams extends DeltaPro3MqttSetMessageParams {
  cfgDc12vOutOpen: boolean;
}

export interface DeltaPro3MqttSetXBoostMessageParams extends DeltaPro3MqttSetMessageParams {
  cfgXboostEn: boolean;
}

export interface DeltaPro3MqttSetReplyMessageData extends MqttSetReplyMessageData {
  actionId: number;
}

export interface DeltaPro3MqttSetAcHvReplyMessageData extends DeltaPro3MqttSetReplyMessageData {
  flowInfoAcHvOut: DeltaPro3AcEnableType;
}

export interface DeltaPro3MqttSetAcLvReplyMessageData extends DeltaPro3MqttSetReplyMessageData {
  flowInfoAcLvOut: DeltaPro3AcEnableType;
}

export interface DeltaPro3MqttSetDc12vReplyMessageData extends DeltaPro3MqttSetReplyMessageData {
  flowInfo12v: DeltaPro3AcEnableType;
}

export interface DeltaPro3MqttSetXBoostReplyMessageData extends DeltaPro3MqttSetReplyMessageData {
  xboostEn: boolean;
}

export interface DeltaPro3MqttSetReplyMessage<TData extends DeltaPro3MqttSetReplyMessageData>
  extends MqttSetReplyMessageWithData<TData> {
  code: string;
  message: string;
  eagleEyeTraceId: string;
  tid: string;
}
