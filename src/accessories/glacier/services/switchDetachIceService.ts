import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { GlacierAllQuotaData } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  GlacierMqttSetDetachIceMessageParams,
  GlacierMqttSetMessageParams,
  GlacierMqttSetMessageWithParams,
  GlacierMqttSetModuleType,
  GlacierMqttSetOperateType,
} from '@ecoflow/accessories/glacier/interfaces/glacierMqttApiContracts';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';
import { SwitchServiceBase } from '@ecoflow/services/switchServiceBase';

export class SwitchDetachIceService extends SwitchServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>) {
    super(ecoFlowAccessory, 'Detach Ice');
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<GlacierMqttSetDetachIceMessageParams>(
      {
        enable: value ? EnableType.On : EnableType.Off,
      },
      revert
    );
  }

  private sendOn<TParams extends GlacierMqttSetMessageParams>(params: TParams, revert: () => void): Promise<void> {
    const message: GlacierMqttSetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      moduleType: GlacierMqttSetModuleType.Default,
      operateType: GlacierMqttSetOperateType.DetachIce,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
