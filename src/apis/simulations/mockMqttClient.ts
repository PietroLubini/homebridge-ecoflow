import { DeviceInfo } from '@ecoflow/apis/containers/deviceInfo';
import { Simulator } from '@ecoflow/apis/simulations/simulator';
import { IClientOptions, IPublishPacket, ISubscriptionGrant, MqttClient, Packet, StreamBuilder } from 'mqtt';

export class MockMqttClient extends MqttClient {
  private emitQuotaIntervalId: NodeJS.Timeout | null = null;
  private emitStatusIntervalId: NodeJS.Timeout | null = null;
  private readonly subscriptionTopics: string[] = [];
  private readonly simulator: Simulator | null;

  constructor(
    private readonly deviceInfo: DeviceInfo,
    options: IClientOptions
  ) {
    super(undefined as unknown as StreamBuilder, options);
    this.deviceInfo.log.warn('Simulating MQTT');
    this.simulator = deviceInfo.config.simulator ? new deviceInfo.config.simulator() : null;
  }

  public override connect(): this {
    this.connected = true;
    return this;
  }

  public override async endAsync(): Promise<void> {
    if (this.emitQuotaIntervalId !== null) {
      clearTimeout(this.emitQuotaIntervalId);
      this.emitQuotaIntervalId = null;
    }
    if (this.emitStatusIntervalId !== null) {
      clearTimeout(this.emitStatusIntervalId);
      this.emitStatusIntervalId = null;
    }
  }

  public override async subscribeAsync(topic: string): Promise<ISubscriptionGrant[]> {
    this.subscriptionTopics.push(topic);

    if (topic.endsWith('quota')) {
      this.emitQuotaIntervalId = setInterval(() => {
        this.emitQuota();
      }, this.deviceInfo.config.simulateQuotaTimeoutMs ?? 10000);
    }
    if (topic.endsWith('status')) {
      this.emitStatusIntervalId = setInterval(() => {
        this.emitStatus();
      }, this.deviceInfo.config.simulateStatusTimeoutMs ?? 10000);
    }
    return [];
  }

  public override async publishAsync(topic: string, message: string): Promise<Packet | undefined> {
    if (this.simulator && topic.endsWith('set')) {
      const replyTopic = `${topic}_reply`;
      if (this.subscriptionTopics.includes(replyTopic)) {
        const responseMessage = this.simulator.generateSetReply(message);
        this.emitMessage(replyTopic, responseMessage);
      }
    }

    return undefined;
  }

  private emitQuota(): void {
    if (this.simulator) {
      this.subscriptionTopics
        .filter(topic => topic.endsWith('quota'))
        .forEach(topic => {
          this.emitMessage(topic, this.simulator!.generateQuota());
        });
    }
  }

  private emitStatus(): void {
    if (this.simulator) {
      this.subscriptionTopics
        .filter(topic => topic.endsWith('status'))
        .forEach(topic => {
          this.emitMessage(topic, this.simulator!.generateStatus());
        });
    }
  }

  private emitMessage(topic: string, message: object): void {
    this.emit('message', topic, Buffer.from(JSON.stringify(message)), undefined as unknown as IPublishPacket);
  }
}
