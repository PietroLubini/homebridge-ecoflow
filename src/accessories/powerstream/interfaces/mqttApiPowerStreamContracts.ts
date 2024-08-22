import { MqttQuotaMessage, MqttQuotaMessageWithParam } from '@ecoflow/apis/interfaces/mqttApiContracts';

export enum MqttPowerStreamMessageType {
  Heartbeat = 1,
  Task = 134,
}

export enum MqttPowerStreamMessageFuncType {
  Func20 = 20,
}

export interface MqttPowerStreamQuotaMessage extends MqttQuotaMessage {
  cmdId: MqttPowerStreamMessageType;
  cmdFunc: MqttPowerStreamMessageFuncType;
}

export interface MqttPowerStreamQuotaMessageWithParams<TParams>
  extends MqttQuotaMessageWithParam<TParams>,
    MqttPowerStreamQuotaMessage {}
