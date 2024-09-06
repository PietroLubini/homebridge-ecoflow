import { AcOutFrequency } from '@ecoflow/accessories/batteries/interfaces/httpApiBatteryContracts';
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
  DcOutCfg = 'dcOutCfg',
  AcOutCfg = 'acOutCfg',
}

export enum MqttBatterySetModuleType {
  PD = 1,
  BMS = 2,
  INV = 3,
  MPPT = 5,
}

export interface MqttBatterySetMessage extends MqttSetMessage {
  operateType: MqttBatterySetOperationType;
  moduleType: MqttBatterySetModuleType;
}

export interface MqttBatterySetMessageWithParams<TParams>
  extends MqttSetMessageWithParams<TParams>,
    MqttBatterySetMessage {}

export interface MqttBatterySetOnMessageParams {
  enabled: number;
}

export interface MqttBatterySetAcOnMessageParams extends MqttBatterySetOnMessageParams {
  out_voltage: number;
  out_freq: AcOutFrequency;
  xboost: number;
}

export interface MqttBatterySetReplyMessage extends MqttSetReplyMessage {
  operateType: MqttBatterySetOperationType;
  moduleType: MqttBatterySetModuleType;
}
