export interface MqttMessage {}

export interface MqttQuotaMessage extends MqttMessage {}

export interface MqttQuotaMessageWithParams<TParams> extends MqttQuotaMessage {
  params: TParams;
}

export interface MqttQuotaMessageWithParam<TParams> extends MqttQuotaMessage {
  param: TParams;
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
