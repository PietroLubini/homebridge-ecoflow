import { AcXBoostType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import {
  MqttQuotaMessage,
  MqttQuotaMessageWithData,
  MqttSetMessage,
  MqttSetMessageWithParams,
  MqttSetReplyMessageData,
  MqttSetReplyMessageWithData,
} from '@ecoflow/apis/interfaces/mqttApiContracts';

export interface DeltaProMqttQuotaMessage extends MqttQuotaMessage {}

export interface DeltaProMqttQuotaMessageWithParams<TParams>
  extends MqttQuotaMessageWithData<TParams>,
    DeltaProMqttQuotaMessage {}

export type DeltaProMqttSetOperationType = 'TCP';

export type DeltaProMqttSetCmdSetType = 32;

export interface DeltaProMqttSetMessage extends MqttSetMessage {
  operateType: DeltaProMqttSetOperationType;
}

export interface DeltaProMqttSetMessageParams {
  cmdSet: DeltaProMqttSetCmdSetType;
  id: number;
}

export interface DeltaProMqttSetMessageWithParams<TParams extends DeltaProMqttSetMessageParams>
  extends MqttSetMessageWithParams<TParams>,
    DeltaProMqttSetMessage {}

export interface DeltaProMqttSetOnMessageParams extends DeltaProMqttSetMessageParams {
  enabled: number;
}

export interface DeltaProMqttSetAcOnMessageParams extends DeltaProMqttSetOnMessageParams {
  xboost: AcXBoostType;
}

export interface DeltaProMqttSetReplyMessageData extends MqttSetReplyMessageData {
  cmdSet: DeltaProMqttSetCmdSetType;
  id: number;
}

export interface DeltaProMqttSetReplyMessage extends MqttSetReplyMessageWithData<DeltaProMqttSetReplyMessageData> {
  operateType: DeltaProMqttSetOperationType;
}
