import {
  MqttMessage,
  MqttQuotaMessage,
  MqttSetReplyMessage,
  MqttTopicType,
} from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceInfoConfig } from '@ecoflow/config';
import { Logging } from 'homebridge';
import { Observable, Subject, Subscription } from 'rxjs';

export class MqttDevice {
  private readonly quotaSubject: Subject<MqttQuotaMessage> = new Subject<MqttQuotaMessage>();
  private readonly setReplySubject: Subject<MqttSetReplyMessage> = new Subject<MqttSetReplyMessage>();
  private readonly quota$: Observable<MqttQuotaMessage> = this.quotaSubject.asObservable();
  private readonly setReply$: Observable<MqttSetReplyMessage> = this.setReplySubject.asObservable();

  constructor(
    public config: DeviceInfoConfig,
    public readonly log: Logging
  ) {}

  public processReceivedMessage(topicType: MqttTopicType, message: MqttMessage): void {
    this.log.debug(`Received message: ${JSON.stringify(message, null, 2)}`);
    switch (topicType) {
      case MqttTopicType.Quota:
        this.quotaSubject.next(message as MqttQuotaMessage);
        break;
      case MqttTopicType.SetReply:
        this.setReplySubject.next(message as MqttSetReplyMessage);
        break;
      default:
        this.log.warn('Received message for unsupported topic:', topicType);
    }
  }

  public subscribeOnMessage<TMessage>(
    topicType: MqttTopicType,
    callback: (message: TMessage) => void
  ): Subscription | undefined {
    switch (topicType) {
      case MqttTopicType.Quota:
        return this.quota$.subscribe(message => callback(message as TMessage));
      case MqttTopicType.SetReply:
        return this.setReply$.subscribe(message => callback(message as TMessage));
      default:
        this.log.warn('Topic is not supported for subscription:', topicType);
        return undefined;
    }
  }
}
