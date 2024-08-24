import { Heartbeat } from '@ecoflow/accessories/powerstream/interfaces/httpApiPowerStreamContracts';
import {
  MqttPowerStreamMessageFuncType,
  MqttPowerStreamMessageType,
  MqttPowerStreamQuotaMessageWithParams,
  MqttPowerStreamSetMessage,
} from '@ecoflow/accessories/powerstream/interfaces/mqttApiPowerStreamContracts';
import { MqttSetReplyMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { SimulatorTyped } from '@ecoflow/apis/simulations/simulator';

export class PowerStreamSimulator extends SimulatorTyped<MqttPowerStreamSetMessage> {
  public override generateQuota(): object {
    const quota: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
      cmdFunc: MqttPowerStreamMessageFuncType.Func20,
      cmdId: MqttPowerStreamMessageType.Heartbeat,
      param: {
        pv1InputWatts: this.getRandomNumber(0.1, 300),
        pv2InputWatts: this.getRandomNumber(0.1, 300),
        batInputWatts: this.getRandomNumber(-600, 600),
        batSoc: this.getRandomNumber(0, 100),
        invOutputWatts: this.getRandomNumber(-600, 600),
        invOnOff: this.getRandomBoolean(),
        supplyPriority: Math.floor(this.getRandomNumber(0, 1)),
        permanentWatts: this.getRandomNumber(0, 600),
        upperLimit: Math.floor(this.getRandomNumber(1, 30)),
        lowerLimit: Math.floor(this.getRandomNumber(70, 100)),
        invBrightness: Math.floor(this.getRandomNumber(0, 1023)),
      },
    };
    return quota;
  }

  public override generateSetReplyTyped(message: MqttPowerStreamSetMessage): object {
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