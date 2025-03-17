import { DeltaPro3AllQuotaData } from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3HttpApiContracts';
import {
  DeltaPro3MqttSetMessageParams,
  DeltaPro3MqttSetMessageWithParams,
  DeltaPro3MqttSetXBoostMessageParams,
} from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3MqttApiContracts';
import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { SwitchXboostServiceBase } from '@ecoflow/services/switchXboostServiceBase';

export class SwitchXboostService extends SwitchXboostServiceBase {
  constructor(protected readonly ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<DeltaPro3AllQuotaData>) {
    super(ecoFlowAccessory);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<DeltaPro3MqttSetXBoostMessageParams>(
      {
        cfgXboostEn: value,
      },
      revert
    );
  }

  private sendOn<TParams extends DeltaPro3MqttSetMessageParams>(params: TParams, revert: () => void): Promise<void> {
    const message: DeltaPro3MqttSetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      sn: this.ecoFlowAccessory.config.serialNumber,
      cmdId: 17,
      dirDest: 1,
      dirSrc: 1,
      cmdFunc: 254,
      dest: 2,
      needAck: true,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
