import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { GlacierAllQuotaData } from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  GlacierMqttSetMakeIceMessageParams,
  GlacierMqttSetMessageParams,
  GlacierMqttSetMessageWithParams,
  GlacierMqttSetModuleType,
  GlacierMqttSetOperateType,
  IceCubeShapeType,
} from '@ecoflow/accessories/glacier/interfaces/glacierMqttApiContracts';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';
import { SwitchServiceBase } from '@ecoflow/services/switchServiceBase';

export class SwitchMakeIceService extends SwitchServiceBase {
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryWithQuotaBase<GlacierAllQuotaData>,
    private readonly iceCubeShapeType: IceCubeShapeType
  ) {
    super(ecoFlowAccessory, `Make Ice ${iceCubeShapeType === IceCubeShapeType.Small ? 'Small' : 'Large'} Cubes`);
  }

  protected override setOn(value: boolean, revert: () => void): Promise<void> {
    return this.sendOn<GlacierMqttSetMakeIceMessageParams>(
      {
        enable: value ? EnableType.On : EnableType.Off,
        iceShape: this.iceCubeShapeType,
      },
      revert
    );
  }

  private sendOn<TParams extends GlacierMqttSetMessageParams>(params: TParams, revert: () => void): Promise<void> {
    const message: GlacierMqttSetMessageWithParams<TParams> = {
      id: 0,
      version: '',
      moduleType: GlacierMqttSetModuleType.Default,
      operateType: GlacierMqttSetOperateType.MakeIce,
      params,
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
