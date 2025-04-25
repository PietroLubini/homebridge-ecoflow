import { MqttQuotaMessage, MqttQuotaMessageWithParams } from '@ecoflow/apis/interfaces/mqttApiContracts';

export interface PowerOceanMqttQuotaMessage extends MqttQuotaMessage {}

export interface PowerOceanMqttQuotaMessageWithParams<TParams>
  extends MqttQuotaMessageWithParams<TParams>,
    PowerOceanMqttQuotaMessage {}
