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
        pv1InputWatts: this.getRandomNumber(1, 3000),
        pv2InputWatts: this.getRandomNumber(1, 3000),
        batInputWatts: this.getRandomNumber(-6000, 6000),
        batSoc: this.getRandomNumber(0, 100),
        invOutputWatts: this.getRandomNumber(-6000, 6000),
        invOnOff: this.getRandomBoolean(),
        supplyPriority: Math.floor(this.getRandomNumber(0, 1)),
        permanentWatts: this.getRandomNumber(0, 6000),
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
