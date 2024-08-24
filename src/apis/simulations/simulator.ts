import { MqttSetMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';

export abstract class Simulator {
  public abstract generateQuota(): object;
  public abstract generateSetReply(message: string): object;

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

  protected getRandomBoolean(): boolean {
    return Math.random() < 0.5;
  }
}
