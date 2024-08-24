import {
  MqttQuotaMessage,
  MqttQuotaMessageWithParams,
  MqttSetMessage,
  MqttSetMessageWithParams,
  MqttSetReplyMessage,
} from '@ecoflow/apis/interfaces/mqttApiContracts';

export enum MqttBatteryMessageType {
  PD = 'pdStatus',
  MPPT = 'mpptStatus',
  INV = 'invStatus',
  BMS = 'bmsStatus',
  EMS = 'emsStatus',
}

export interface MqttBatteryQuotaMessage extends MqttQuotaMessage {
  typeCode: MqttBatteryMessageType;
}

export interface MqttBatteryQuotaMessageWithParams<TParams>
  extends MqttQuotaMessageWithParams<TParams>,
    MqttBatteryQuotaMessage {}

export enum MqttBatterySetOperationType {
  MpptCar = 'mpptCar',
  DcChgCfg = 'dcChgCfg',
  AcOutCfg = 'acOutCfg',
}

export interface MqttBatterySetMessage extends MqttSetMessage {
  operateType: MqttBatterySetOperationType;
  moduleType: number;
}

export interface MqttBatterySetMessageWithParams<TParams>
  extends MqttSetMessageWithParams<TParams>,
    MqttBatterySetMessage {}

export interface MqttBatterySetOnMessageParams {
  enabled: number;
}

export interface MqttBatterySetAcOnMessageParams extends MqttBatterySetOnMessageParams {
  out_voltage: number;
  out_freq: number;
  xboost: number;
}

export interface MqttBatterySetReplyMessage extends MqttSetReplyMessage {
  operateType: MqttBatterySetOperationType;
  moduleType: number;
}
