import { EnableType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { CoolModeType, TemperatureType } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  MqttQuotaMessage,
  MqttQuotaMessageWithParams,
  MqttSetMessage,
  MqttSetMessageWithParams,
  MqttSetReplyMessage,
} from '@ecoflow/apis/interfaces/mqttApiContracts';

export enum GlacierMqttSetModuleType {
  Default = 1,
}

export enum GlacierMqttMessageType {
  PD = 'pdStatus',
  BMS = 'bmsStatus',
  EMS = 'emsStatus',
}

export interface GlacierMqttQuotaMessage extends MqttQuotaMessage {
  typeCode: GlacierMqttMessageType;
}

export interface GlacierMqttQuotaMessageWithParams<TParams>
  extends MqttQuotaMessageWithParams<TParams>,
    GlacierMqttQuotaMessage {}

export enum GlacierMqttSetOperateType {
  Temperature = 'temp',
  TemperatureUnit = 'tmpUnit',
  EcoMode = 'ecoMode',
  MakeIce = 'iceMake',
  DetachIce = 'deIce',
}

export interface GlacierMqttSetMessage extends MqttSetMessage {
  moduleType: GlacierMqttSetModuleType;
  operateType: GlacierMqttSetOperateType;
}

export interface GlacierMqttSetMessageParams {}

export interface GlacierMqttSetMessageWithParams<TParams extends GlacierMqttSetMessageParams>
  extends MqttSetMessageWithParams<TParams>,
    GlacierMqttSetMessage {}

export interface GlacierMqttSetTemperatureMessageParams extends GlacierMqttSetMessageParams {
  tmpR?: number; // TODO: should be verified that could be set separately
  tmpL?: number;
  tmpM?: number;
}

export interface GlacierMqttSetTemperatureUnitMessageParams extends GlacierMqttSetMessageParams {
  unit: TemperatureType;
}

export interface GlacierMqttSetEcoModeMessageParams extends GlacierMqttSetMessageParams {
  mode: CoolModeType;
}

export enum IceCubeShapeType {
  Small = 0,
  Large = 1,
}

export interface GlacierMqttSetMakeIceMessageParams extends GlacierMqttSetMessageParams {
  enable: EnableType;
  iceShape: IceCubeShapeType;
}

export interface GlacierMqttSetDetachIceMessageParams extends GlacierMqttSetMessageParams {
  enable: EnableType;
}

export interface GlacierMqttSetReplyMessage extends MqttSetReplyMessage {
  moduleType: GlacierMqttSetModuleType;
  operateType: GlacierMqttSetOperateType;
}
