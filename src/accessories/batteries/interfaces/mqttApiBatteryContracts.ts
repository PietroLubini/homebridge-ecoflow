import { MqttQuotaMessage, MqttQuotaMessageWithParams } from '@ecoflow/apis/interfaces/mqttApiContracts';

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
