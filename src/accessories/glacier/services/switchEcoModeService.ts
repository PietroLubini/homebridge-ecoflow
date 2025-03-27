import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { CoolModeType, GlacierAllQuotaData } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  GlacierMqttSetEcoModeMessageParams,
  GlacierMqttSetMessageParams,
  GlacierMqttSetMessageWithParams,
  GlacierMqttSetModuleType,
  GlacierMqttSetOperateType,
} from '@ecoflow/accessories/glacier/interfaces/glacierMqttApiContracts';
import { SwitchServiceBase } from '@ecoflow/services/switchServiceBase';

export class SwitchEcoModeService extends SwitchServiceBase {
  constructor(protected readonly ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>) {
    super(ecoFlowAccessory, 'ECO mode');
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<GlacierMqttSetEcoModeMessageParams>(
      {
        mode: value ? CoolModeType.Eco : CoolModeType.Normal,
      },
      revert
    );
  }

  private sendOn<TParams extends GlacierMqttSetMessageParams>(params: TParams, revert: () => void): Promise<void> {
    const message: GlacierMqttSetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      moduleType: GlacierMqttSetModuleType.Default,
      operateType: GlacierMqttSetOperateType.EcoMode,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
