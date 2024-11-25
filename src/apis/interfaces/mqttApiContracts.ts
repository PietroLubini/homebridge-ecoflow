export interface MqttMessage {}

export interface MqttQuotaMessage extends MqttMessage {}

export interface MqttQuotaMessageWithParams<TParams> extends MqttQuotaMessage {
  params: TParams;
}

export interface MqttQuotaMessageWithParam<TParams> extends MqttQuotaMessage {
  param: TParams;
}

export interface MqttQuotaMessageWithData<TParams> extends MqttQuotaMessage {
  data: TParams;
}

export interface MqttSetMessage extends MqttMessage {
  id: number;
  version: string;
}

export interface MqttSetMessageWithParams<TParams> extends MqttSetMessage {
  params: TParams;
}

export interface MqttSetReplyMessageData {
  ack: boolean;
}

export interface MqttSetReplyMessage extends MqttSetReplyMessageWithData<MqttSetReplyMessageData> {
  data: {
    ack: boolean;
  };
}

export interface MqttSetReplyMessageWithData<TData extends MqttSetReplyMessageData> extends MqttSetMessage {
  data: TData;
}

export enum MqttTopicType {
  Quota = 'quota',
  SetReply = 'set_reply',
}
