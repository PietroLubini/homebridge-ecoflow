export enum MqttMessageType {
  PD = 'pdStatus',
  MPPT = 'mpptStatus',
  INV = 'invStatus',
  BMS = 'bmsStatus',
  EMS = 'emsStatus',
}

export interface MqttMessageBase {
  typeCode: MqttMessageType;
}

export interface MqttMessage<TParams extends MqttMessageParams> extends MqttMessageBase {
  params: TParams;
}

export interface MqttMessageParams {}

export interface PdStatusMqttMessageCarParams {
  carState?: boolean;
  carWatts?: number;
}

export interface PdStatusMqttMessageUsbParams {
  dcOutState?: boolean;
  usb1Watts?: number;
  usb2Watts?: number;
  qcUsb1Watts?: number;
  qcUsb2Watts?: number;
  typec1Watts?: number;
  typec2Watts?: number;
}

export interface PdStatusMqttMessageParams
  extends MqttMessageParams,
    PdStatusMqttMessageCarParams,
    PdStatusMqttMessageUsbParams {
  beepMode?: boolean;
}

export interface MpptStatusMqttMessageParams extends MqttMessageParams {}

export interface InvStatusMqttMessageAcParams {
  cfgAcEnabled?: boolean;
  outputWatts?: number;
}

export interface InvStatusMqttMessageParams extends MqttMessageParams, InvStatusMqttMessageAcParams {
  inputWatts?: number;
}

export interface BmsStatusMqttMessageParams extends MqttMessageParams {
  soc?: number;
  vol?: number;
  amp?: number;
  temp?: number;
  f32ShowSoc?: number;
}

export interface EmsStatusMqttMessageParams extends MqttMessageParams {}

export interface MqttSetMessageBase {
  id: number;
  version: string;
  moduleType: number;
  operateType: string;
}

export interface MqttSetMessageParams {}

export interface MqttSetEnabledMessageParams extends MqttSetMessageParams {
  enabled: number;
}

export interface MqttSetAcEnabledMessageParams extends MqttSetEnabledMessageParams {
  out_voltage: number;
  out_freq: number;
  xboost: number;
}

export interface MqttSetMessage<TParams extends MqttSetMessageParams> extends MqttSetMessageBase {
  params: TParams;
}
