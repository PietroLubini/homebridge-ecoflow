import { Heartbeat } from '@ecoflow/accessories/smartplug/interfaces/smartPlugHttpApiContracts';
import {
  SmartPlugMqttMessageFuncType,
  SmartPlugMqttMessageType,
  SmartPlugMqttQuotaMessageWithParams,
  SmartPlugMqttSetMessage,
} from '@ecoflow/accessories/smartplug/interfaces/smartPlugMqttApiContracts';
import { MqttSetReplyMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { SimulatorTyped } from '@ecoflow/apis/simulations/simulator';

export class SmartPlugSimulator extends SimulatorTyped<SmartPlugMqttSetMessage> {
  public override generateQuota(): object {
    const quota: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
      cmdFunc: SmartPlugMqttMessageFuncType.Func2,
      cmdId: SmartPlugMqttMessageType.Heartbeat,
      param: {
        brightness: Math.floor(this.getRandomNumber(0, 1023)),
        current: this.getRandomNumber(0, 100000),
        volt: this.getRandomNumber(180, 240),
        switchSta: this.getRandomBoolean(),
        temp: this.getRandomNumber(10, 40),
        watts: this.getRandomNumber(0, 2500),
      },
    };
    return quota;
  }

  public override generateSetReplyTyped(message: SmartPlugMqttSetMessage): object {
    const reply: MqttSetReplyMessage = {
      id: message.id,
      version: message.version,
      data: {
        ack: false,
      },
    };
    return reply;
  }
}
