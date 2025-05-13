import { DiscoveryAllQuotaData } from '@ecoflow/accessories/discovery/interfaces/discoveryHttpApiContracts';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { ServiceBase } from '@ecoflow/services/serviceBase';

export class DiscoveryAccessory extends EcoFlowAccessoryWithQuotaBase<DiscoveryAllQuotaData> {
  protected override getServices(): ServiceBase[] {
    return [];
  }

  protected override processQuotaMessage(message: MqttQuotaMessage): void {
    this.log.info(`Received quota: ${JSON.stringify(message, null, 2)}`);
  }

  protected override initializeQuota(quota: DiscoveryAllQuotaData | null): DiscoveryAllQuotaData {
    const result = quota ?? ({} as DiscoveryAllQuotaData);
    return result;
  }

  protected override updateInitialValues(initialData: DiscoveryAllQuotaData): void {
    this.log.info(`Received quota (initial): ${JSON.stringify(initialData, null, 2)}`);
  }
}
