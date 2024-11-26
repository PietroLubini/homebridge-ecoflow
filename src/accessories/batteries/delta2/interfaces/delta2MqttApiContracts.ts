import { AcOutFrequencyType, AcXBoostType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import {
  MqttQuotaMessage,
  MqttQuotaMessageWithParams,
  MqttSetMessage,
  MqttSetMessageWithParams,
  MqttSetReplyMessage,
} from '@ecoflow/apis/interfaces/mqttApiContracts';

export enum Delta2MqttMessageType {
  PD = 'pdStatus',
  MPPT = 'mpptStatus',
  INV = 'invStatus',
  BMS = 'bmsStatus',
  EMS = 'emsStatus',
}

export interface Delta2MqttQuotaMessage extends MqttQuotaMessage {
  typeCode: Delta2MqttMessageType;
}

export interface Delta2MqttQuotaMessageWithParams<TParams>
  extends MqttQuotaMessageWithParams<TParams>,
    Delta2MqttQuotaMessage {}

export enum Delta2MqttSetOperationType {
  MpptCar = 'mpptCar',
  DcOutCfg = 'dcOutCfg',
  AcOutCfg = 'acOutCfg',
}

export enum Delta2MqttSetModuleType {
  PD = 1,
  BMS = 2,
  INV = 3,
  MPPT = 5,
}

export interface Delta2MqttSetMessage extends MqttSetMessage {
  operateType: Delta2MqttSetOperationType;
  moduleType: Delta2MqttSetModuleType;
}

export interface Delta2MqttSetMessageParams {}

export interface Delta2MqttSetMessageWithParams<TParams extends Delta2MqttSetMessageParams>
  extends MqttSetMessageWithParams<TParams>,
    Delta2MqttSetMessage {}

export interface Delta2MqttSetOnMessageParams extends Delta2MqttSetMessageParams {
  enabled: number;
}

export interface Delta2MqttSetAcOnMessageParams extends Delta2MqttSetOnMessageParams {
  out_voltage: number;
  out_freq: AcOutFrequencyType;
  xboost: AcXBoostType;
}

export interface Delta2MqttSetReplyMessage extends MqttSetReplyMessage {
  operateType: Delta2MqttSetOperationType;
  moduleType: Delta2MqttSetModuleType;
}
