import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { DeviceConfig } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { Logging, PlatformAccessory } from 'homebridge';

export abstract class EcoFlowAccessoryWithQuotaBase<TAllQuotaData> extends EcoFlowAccessoryBase {
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
