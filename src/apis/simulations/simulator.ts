import { MqttSetMessage, MqttStatusMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';

export abstract class Simulator {
  public abstract generateQuota(): object;
  public abstract generateSetReply(message: string): object;

  public generateStatus(): MqttStatusMessage {
    const status: MqttStatusMessage = {
      id: `${Math.floor(Math.random() * 1000000)}`,
      version: '1.0',
      timestamp: Date.now(),
      params: {
        status: this.getRandomBoolean() ? EnableType.On : EnableType.Off,
      },
    };
    return status;
  }

  protected getRandomNumber(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  protected getRandomBoolean(): boolean {
    return Math.random() < 0.5;
  }
}

export abstract class SimulatorTyped<TSetMessage extends MqttSetMessage> extends Simulator {
  public override generateSetReply(message: string): object {
    const msgObj = JSON.parse(message) as TSetMessage;
    return this.generateSetReplyTyped(msgObj);
  }

  public abstract generateSetReplyTyped(message: TSetMessage): object;

  protected getRandomNumber(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  protected getRandomInt(min: number, max: number): number {
    return Math.round(this.getRandomNumber(min, max));
  }

  protected getRandomBoolean(): boolean {
    return Math.random() < 0.5;
  }
}
