import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { Enum } from '@ecoflow/apis/interfaces/generalContacts';
import { FanServiceBase } from '@ecoflow/services/fanServiceBase';

export abstract class FanPositionedServiceBase<TPositionType, TPositionTypeObj extends Enum> extends FanServiceBase {
  private readonly positionLength: number;
  constructor(
    ecoFlowAccessory: EcoFlowAccessoryBase,
    serviceSubType: string,
    private positionTypeObj: TPositionTypeObj
  ) {
    super(ecoFlowAccessory, 100, serviceSubType);
    this.positionLength = 100 / Object.values(positionTypeObj).filter(v => typeof v === 'number').length / 2;
  }

  protected override async processOnSetRotationSpeed(value: number, revert: () => void): Promise<number> {
    const positionedValue = this.covertToPositionedValue(value);
    await this.processOnSetPositionedRotationSpeed(positionedValue, revert);
    return this.covertFromPositionedValue(positionedValue);
  }

  protected abstract processOnSetPositionedRotationSpeed(value: TPositionType, revert: () => void): Promise<void>;

  private covertToPositionedValue(value: number): TPositionType {
    const pos = Math.floor(value / this.positionLength);
    return Object.values(this.positionTypeObj)[pos] as unknown as TPositionType;
  }

  private covertFromPositionedValue(value: TPositionType): number {
    const pos = value as unknown as number;
    return Math.round(pos * this.positionLength);
  }
}
