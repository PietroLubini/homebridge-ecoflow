export enum MqttMessageType {
  PD = 'pdStatus',
  MPPT = 'mpptStatus',
  INV = 'invStatus',
  BMS = 'bmsStatus',
  EMS = 'emsStatus',
}

export interface MqttMessage {}

export interface MqttQuotaMessage extends MqttMessage {
  typeCode: MqttMessageType;
}

export interface MqttQuotaMessageWithParams<TParams> extends MqttQuotaMessage {
  typeCode: MqttMessageType;
  params: TParams;
}

export interface MqttSetMessage extends MqttMessage {
  id: number;
  version: string;
  operateType: string;
}

export interface MqttSetMessageWithParams<TParams> extends MqttSetMessage {
  moduleType: number;
  params: TParams;
}

export interface MqttSetReplyMessage extends MqttSetMessage {
  data: {
    ack: boolean;
  };
}

export enum MqttTopicType {
  Quota = 'quota',
  SetReply = 'set_reply',
}
