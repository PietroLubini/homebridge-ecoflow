import {
  MqttQuotaMessage,
  MqttQuotaMessageWithParam,
  MqttSetMessage,
  MqttSetMessageWithParams,
} from '@ecoflow/apis/interfaces/mqttApiContracts';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';

export enum SmartPlugMqttMessageType {
  Heartbeat = 1,
  Task = 2,
}
export enum SmartPlugMqttMessageFuncType {
  Func2 = 2,
}

export interface SmartPlugMqttQuotaMessage extends MqttQuotaMessage {
  cmdId: SmartPlugMqttMessageType;
  cmdFunc: SmartPlugMqttMessageFuncType;
}

export interface SmartPlugMqttQuotaMessageWithParams<TParams>
  extends MqttQuotaMessageWithParam<TParams>,
    SmartPlugMqttQuotaMessage {}

export enum SmartPlugMqttSetCmdCodeType {
  Switch = 'WN511_SOCKET_SET_PLUG_SWITCH_MESSAGE',
  Brightness = 'WN511_SOCKET_SET_BRIGHTNESS_PACK',
}

export interface SmartPlugMqttSetMessage extends MqttSetMessage {
  cmdCode: SmartPlugMqttSetCmdCodeType;
}

export interface SmartPlugMqttSetMessageParams {}

export interface SmartPlugMqttSetMessageWithParams<TParams extends SmartPlugMqttSetMessageParams>
  extends MqttSetMessageWithParams<TParams>,
    SmartPlugMqttSetMessage {}

export interface SmartPlugMqttSetSwitchMessageParams extends SmartPlugMqttSetMessageParams {
  plugSwitch: EnableType;
}

export interface SmartPlugMqttSetBrightnessMessageParams extends SmartPlugMqttSetMessageParams {
  brightness: number;
}
