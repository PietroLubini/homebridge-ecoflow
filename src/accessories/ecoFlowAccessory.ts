import { DeviceInfo } from '@ecoflow/apis/containers/deviceInfo';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import {
  MqttQuotaMessage,
  MqttSetMessage,
  MqttSetMessageWithParams,
  MqttSetReplyMessage,
} from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceConfig } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';
import { Subscription } from 'rxjs';

export abstract class EcoFlowAccessory {
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
        this.log.warn('Removing obsolete service from accessory:', service.displayName);
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

  public async sendSetCommand<TParams>(
    moduleType: number,
    operateType: string,
    params: TParams,
    revert: () => void
  ): Promise<void> {
    const requestMessage: MqttSetMessageWithParams<TParams> = {
      id: Math.floor(Math.random() * 1000000),
      version: '1.0',
      moduleType,
      operateType,
      params,
    };
    this.setReplies[this.getMqttSetMessageKey(requestMessage)] = { requestMessage, revert };
    await this.mqttApiManager.sendSetCommand(this.deviceInfo, requestMessage);
  }

  protected abstract getServices(): ServiceBase[];

  protected subscribeOnParameterUpdates(): Subscription[] {
    const subscriptions = [
      this.mqttApiManager.subscribeOnQuotaMessage(this.deviceInfo, this.processQuotaMessage.bind(this)),
      this.mqttApiManager.subscribeOnSetReplyMessage(this.deviceInfo, this.processSetReplyMessage.bind(this)),
    ];
    return subscriptions.filter(subscription => !!subscription);
  }

  protected abstract processQuotaMessage(message: MqttQuotaMessage): void;

  protected processSetReplyMessage(message: MqttSetReplyMessage): void {
    const messageKey = this.getMqttSetMessageKey(message);
    const command = this.setReplies[messageKey];
    if (!command) {
      this.log.debug('Received "SetReply" response was not sent by accessory. Ignore it:', message);
      return;
    }
    this.log.debug('Received "SetReply" response:', message);
    delete this.setReplies[messageKey];
    if (message.data.ack) {
      this.log.warn('Failed to set a value. Reverts value back for:', command.requestMessage.operateType);
      command.revert();
    } else {
      this.log.debug('Setting of a value was successful for:', command.requestMessage.operateType);
    }
  }

  private getMqttSetMessageKey(message: MqttSetMessage): string {
    return `${message.operateType}_${message.id}`;
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
      (await this.mqttApiManager.subscribeOnSetReplyTopic(this.deviceInfo));

    if (this.isMqttConnected) {
      this.subscriptions = this.subscribeOnParameterUpdates();
    }
  }
}

export abstract class EcoFlowAccessoryWithQuota<TAllQuotaData> extends EcoFlowAccessory {
  private _quota: TAllQuotaData | null = null;

  constructor(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    log: Logging,
    httpApiManager: EcoFlowHttpApiManager,
    mqttApiManager: EcoFlowMqttApiManager
  ) {
    super(platform, accessory, config, log, httpApiManager, mqttApiManager);
  }

  public override async initializeDefaultValues(shouldUpdateInitialValues: boolean = true): Promise<void> {
    if (!this._quota) {
      this._quota = await this.httpApiManager.getAllQuotas<TAllQuotaData>(this.deviceInfo);
    }
    const quotaReceived = !!this._quota;
    this._quota = this.initializeQuota(this._quota);
    if (!quotaReceived) {
      this.log.warn('Quotas were not received');
    }
    if (quotaReceived && shouldUpdateInitialValues) {
      this.updateInitialValues(this.quota);
    }
  }

  public get quota(): TAllQuotaData {
    if (!this._quota) {
      this._quota = this.initializeQuota(this._quota);
    }
    return this._quota;
  }

  protected abstract updateInitialValues(quota: TAllQuotaData): void;

  protected abstract initializeQuota(quota: TAllQuotaData | null): TAllQuotaData;

  protected sum(...values: (number | undefined)[]): number {
    return values.filter(value => value !== undefined).reduce((sum, value) => sum + value, 0);
  }
}
