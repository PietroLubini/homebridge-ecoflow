import { Logging, PlatformAccessory } from 'homebridge';
import { Subscription } from 'rxjs';
import { EcoFlowHttpApi } from '../apis/ecoFlowHttpApi.js';
import {
  EcoFlowMqttApi,
  MqttQuotaMessage,
  MqttSetMessage,
  MqttSetMessageWithParams,
  MqttSetReplyMessage,
} from '../apis/ecoFlowMqttApi.js';
import { DeviceConfig } from '../config.js';
import { EcoFlowHomebridgePlatform } from '../platform.js';
import { AccessoryInformationService } from '../services/accessoryInformationService.js';
import { ServiceBase } from '../services/serviceBase.js';

export abstract class EcoFlowAccessory {
  protected readonly mqttApi: EcoFlowMqttApi;
  protected readonly httpApi: EcoFlowHttpApi;
  private services: ServiceBase[] = [];
  private reconnectMqttTimeoutId: NodeJS.Timeout | null = null;
  private isMqttConnected: boolean = false;
  private subscriptions: Subscription[] = [];
  public readonly setReplies: Record<string, { requestMessage: MqttSetMessage; revert: () => void }> = {};

  constructor(
    public readonly platform: EcoFlowHomebridgePlatform,
    public readonly accessory: PlatformAccessory,
    public readonly config: DeviceConfig,
    public readonly log: Logging
  ) {
    this.httpApi = new EcoFlowHttpApi(this.config, this.log);
    this.mqttApi = new EcoFlowMqttApi(this.httpApi, this.log);
  }

  public async initialize(): Promise<void> {
    this.services = this.getServices();
    this.services.push(new AccessoryInformationService(this));
    this.initializeServices();
    this.subscriptions = this.subscribeOnParameterUpdates();
    await this.connectMqtt();
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
    await this.mqttApi.sendSetCommand(this.config.serialNumber, requestMessage);
  }

  protected abstract getServices(): ServiceBase[];

  protected subscribeOnParameterUpdates(): Subscription[] {
    return [
      this.mqttApi.quota$.subscribe(message => this.processQuotaMessage(message)),
      this.mqttApi.setReply$.subscribe(message => this.processSetReplyMessage(message)),
    ];
  }

  protected abstract processQuotaMessage(message: MqttQuotaMessage): void;

  protected processSetReplyMessage(message: MqttSetReplyMessage): void {
    const messageKey = this.getMqttSetMessageKey(message);
    const command = this.setReplies[messageKey];
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
    this.cleanupServices();
  }

  private cleanupServices(): void {
    const services = this.services.map(service => service.service);
    this.accessory.services
      .filter(service => !services.includes(service))
      .forEach(service => {
        this.log.info('Removing obsolete service from accessory:', service.displayName);
        this.accessory.removeService(service);
      });
    this.services
      .filter(service => this.accessory.services.includes(service.service))
      .forEach(service => service.cleanupCharacteristics());
  }

  private async connectMqtt(): Promise<void> {
    await this.initMqtt();
    this.reconnectMqttTimeoutId = setInterval(async () => {
      // Check MQTT is connected every minute
      if (!this.isMqttConnected) {
        await this.initMqtt();
      }
    }, 60 * 1000);
  }

  private async initMqtt(): Promise<void> {
    this.isMqttConnected =
      (await this.mqttApi.subscribeOnQuota(this.config.serialNumber)) &&
      (await this.mqttApi.subscribeOnSetReply(this.config.serialNumber));
  }
}

export abstract class EcoFlowAccessoryWithQuota<TAllQuotaData> extends EcoFlowAccessory {
  private _quota: TAllQuotaData | null = null;

  public override async initialize(): Promise<void> {
    if (!this._quota) {
      this._quota = await this.httpApi.getAllQuotas<TAllQuotaData>();
    }
    await super.initialize();
    this.updateInitialValues(this._quota);
  }

  public get quota(): TAllQuotaData {
    return this._quota!;
  }

  protected abstract updateInitialValues(quota: TAllQuotaData): void;
}
