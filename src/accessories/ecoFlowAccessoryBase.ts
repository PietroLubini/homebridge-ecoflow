import { DeviceInfo } from '@ecoflow/apis/containers/deviceInfo';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import {
  MqttQuotaMessage,
  MqttSetMessage,
  MqttSetReplyMessage,
  MqttStatusMessage,
} from '@ecoflow/apis/interfaces/mqttApiContracts';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';
import { DeviceConfig } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';
import { Subscription } from 'rxjs';

export abstract class EcoFlowAccessoryBase {
  private _services: ServiceBase[] = [];
  private reconnectMqttTimeoutId: NodeJS.Timeout | null = null;
  private isMqttConnected: boolean = false;
  private subscriptions: Subscription[] = [];
  protected readonly deviceInfo: DeviceInfo;
  public readonly setReplies: Record<string, { requestMessage: MqttSetMessage; revert: () => void }> = {};

  constructor(
    public readonly platform: EcoFlowHomebridgePlatform,
    public readonly accessory: PlatformAccessory,
    public readonly config: DeviceConfig,
    public readonly log: Logging,
    protected readonly httpApiManager: EcoFlowHttpApiManager,
    protected readonly mqttApiManager: EcoFlowMqttApiManager
  ) {
    this.deviceInfo = new DeviceInfo(config, log);
  }

  // Getter for services
  public get services(): ServiceBase[] {
    return this._services;
  }

  public async initialize(): Promise<void> {
    this._services = this.getServices();
    this._services.push(new AccessoryInformationService(this));
    this.initializeServices();
    await this.connectMqtt();
  }

  public abstract initializeDefaultValues(): Promise<void>;

  public cleanupServices(): void {
    const services = this.services.map(service => service.service);
    this.accessory.services
      .filter(service => !services.includes(service))
      .forEach(service => {
        this.log.warn(
          'Removing obsolete service from accessory:',
          service.displayName === undefined || service.displayName === '' ? service.name : service.displayName
        );
        this.accessory.removeService(service);
      });
    this.services
      .filter(service => this.accessory.services.includes(service.service))
      .forEach(service => service.cleanupCharacteristics());
  }

  public destroy() {
    if (this.reconnectMqttTimeoutId !== null) {
      clearTimeout(this.reconnectMqttTimeoutId);
      this.reconnectMqttTimeoutId = null;
    }
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  public async sendSetCommand(message: MqttSetMessage, revert: () => void): Promise<void> {
    message.id = Math.floor(Math.random() * 1000000);
    message.version = '1.0';
    this.setReplies[this.getMqttSetMessageKey(message)] = { requestMessage: message, revert };
    await this.mqttApiManager.sendSetCommand(this.deviceInfo, message);
  }

  protected abstract getServices(): ServiceBase[];

  protected subscribeOnParameterUpdates(): Subscription[] {
    const subscriptions = [
      this.mqttApiManager.subscribeOnQuotaMessage(this.deviceInfo, this.processQuotaMessage.bind(this)),
      this.mqttApiManager.subscribeOnSetReplyMessage(this.deviceInfo, this.processSetReplyMessage.bind(this)),
      this.mqttApiManager.subscribeOnStatusMessage(this.deviceInfo, this.processStatusMessage.bind(this)),
    ];
    return subscriptions.filter(subscription => !!subscription);
  }

  protected abstract processQuotaMessage(message: MqttQuotaMessage): void;

  protected processStatusMessage(message: MqttStatusMessage): void {
    const status = message.params.status;
    const online = status === EnableType.On;
    this.log.warn(`Device is ${online ? 'online' : 'offline'}`);
    this.services.forEach(service => service.updateReachability(online));
  }

  protected processSetReplyMessage(message: MqttSetReplyMessage): void {
    const messageKey = this.getMqttSetMessageKey(message);
    const command = this.setReplies[messageKey];
    if (!command) {
      this.log.debug('Received "SetReply" response was not sent by accessory. Ignore it:', message);
      return;
    }
    this.log.debug('Received "SetReply" response:', message);
    delete this.setReplies[messageKey];
    // Detect whether response is successfull for different contracts (e.g. data.ack, data.result, data.configOk)
    if (
      (message.data.ack === undefined && message.data.result === undefined && message.data.configOk === undefined) ||
      (message.data.ack !== undefined && Boolean(message.data.ack) !== false) ||
      (message.data.result !== undefined && message.data.result !== false) ||
      (message.data.configOk !== undefined && message.data.configOk === false)
    ) {
      this.log.warn('Failed to set a value. Reverts value back for:', command.requestMessage.id);
      command.revert();
    } else {
      this.log.debug('Setting of a value was successful for:', command.requestMessage.id);
    }
  }

  private getMqttSetMessageKey(message: MqttSetMessage): string {
    return message.id.toString();
  }

  private initializeServices(): void {
    this.services.forEach(service => {
      service.initialize();
    });
  }

  private async connectMqtt(): Promise<void> {
    await this.initMqtt();
    this.reconnectMqttTimeoutId = setInterval(async () => {
      // Check MQTT is connected every minute
      if (!this.isMqttConnected) {
        await this.initMqtt();
      }
    }, this.config.reconnectMqttTimeoutMs ?? 60000);
  }

  private async initMqtt(): Promise<void> {
    this.isMqttConnected =
      (await this.mqttApiManager.subscribeOnQuotaTopic(this.deviceInfo)) &&
      (await this.mqttApiManager.subscribeOnSetReplyTopic(this.deviceInfo)) &&
      (await this.mqttApiManager.subscribeOnStatusTopic(this.deviceInfo));

    if (this.isMqttConnected) {
      this.subscriptions = this.subscribeOnParameterUpdates();
    }
  }
}
