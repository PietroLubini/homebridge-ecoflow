import { SupplyPriorityType } from '@ecoflow/accessories/powerstream/interfaces/powerStreamHttpApiContracts';
import {
  MqttQuotaMessage,
  MqttQuotaMessageWithParam,
  MqttSetMessage,
  MqttSetMessageWithParams,
} from '@ecoflow/apis/interfaces/mqttApiContracts';

export enum PowerStreamMqttMessageType {
  Heartbeat = 1,
  Task = 134,
}

export enum PowerStreamMqttMessageFuncType {
  Func20 = 20,
}

export interface PowerStreamMqttQuotaMessage extends MqttQuotaMessage {
  cmdId: PowerStreamMqttMessageType;
  cmdFunc: PowerStreamMqttMessageFuncType;
}

export interface PowerStreamMqttQuotaMessageWithParams<TParams>
  extends MqttQuotaMessageWithParam<TParams>,
    PowerStreamMqttQuotaMessage {}

export enum PowerStreamMqttSetCmdCodeType {
  WN511_SET_SUPPLY_PRIORITY_PACK = 'WN511_SET_SUPPLY_PRIORITY_PACK',
  WN511_SET_PERMANENT_WATTS_PACK = 'WN511_SET_PERMANENT_WATTS_PACK',
  WN511_SET_BAT_LOWER_PACK = 'WN511_SET_BAT_LOWER_PACK',
  WN511_SET_BAT_UPPER_PACK = 'WN511_SET_BAT_UPPER_PACK',
  WN511_SET_BRIGHTNESS_PACK = 'WN511_SET_BRIGHTNESS_PACK',
}

export interface PowerStreamMqttSetMessage extends MqttSetMessage {
  cmdCode: PowerStreamMqttSetCmdCodeType;
}

export interface PowerStreamMqttSetMessageParams {}

export interface PowerStreamMqttSetMessageWithParams<TParams extends PowerStreamMqttSetMessageParams>
  extends MqttSetMessageWithParams<TParams>,
    PowerStreamMqttSetMessage {}

export interface PowerStreamMqttSetSupplyPriorityMessageParams extends PowerStreamMqttSetMessageParams {
  supplyPriority: SupplyPriorityType;
}

export interface PowerStreamMqttSetPermanentWattsMessageParams extends PowerStreamMqttSetMessageParams {
  permanentWatts: number;
}

export interface PowerStreamMqttSetLowerLimitMessageParams extends PowerStreamMqttSetMessageParams {
  lowerLimit: number;
}

export interface PowerStreamMqttSetUpperLimitMessageParams extends PowerStreamMqttSetMessageParams {
  upperLimit: number;
}

export interface PowerStreamMqttSetBrightnessMessageParams extends PowerStreamMqttSetMessageParams {
  brightness: number;
}
