import {
  MqttQuotaMessage,
  MqttQuotaMessageWithParam,
  MqttSetMessage,
  MqttSetMessageWithParams,
} from '@ecoflow/apis/interfaces/mqttApiContracts';

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

export enum MqttPowerStreamSetCmdCodeType {
  WN511_SET_SUPPLY_PRIORITY_PACK = 'WN511_SET_SUPPLY_PRIORITY_PACK',
  WN511_SET_PERMANENT_WATTS_PACK = 'WN511_SET_PERMANENT_WATTS_PACK',
  WN511_SET_BAT_LOWER_PACK = 'WN511_SET_BAT_LOWER_PACK',
  WN511_SET_BAT_UPPER_PACK = 'WN511_SET_BAT_UPPER_PACK',
  WN511_SET_BRIGHTNESS_PACK = 'WN511_SET_BRIGHTNESS_PACK',
}

export interface MqttPowerStreamSetMessage extends MqttSetMessage {
  cmdCode: MqttPowerStreamSetCmdCodeType;
}

export interface MqttPowerStreamSetMessageWithParams<TParams>
  extends MqttSetMessageWithParams<TParams>,
    MqttPowerStreamSetMessage {}

export interface MqttPowerStreamSetSupplyPriorityMessageParams {
  supplyPriority: boolean;
}

export interface MqttPowerStreamSetPermanentWattsMessageParams {
  permanentWatts: number;
}

export interface MqttPowerStreamSetLowerLimitMessageParams {
  lowerLimit: number;
}

export interface MqttPowerStreamSetUpperLimitMessageParams {
  upperLimit: number;
}

export interface MqttPowerStreamSetBrightnessMessageParams {
  brightness: number;
}
